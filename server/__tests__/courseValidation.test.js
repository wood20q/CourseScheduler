const request = require('supertest');
const app = require('../index');
const { sequelize, Course } = require('../db');
const initialCourses = require('../initialCourses');

describe('Catalog Referential Integrity and Cycle Prevention Integration Tests (Issue #31)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  describe('Referential Integrity Validation (POST /api/courses)', () => {
    test('rejects course creation with non-existent prerequisite code (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS601',
          name: 'Advanced Systems',
          credits: 3,
          prerequisites: 'NONEXISTENT999'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/NONEXISTENT999/i);
    });

    test('rejects course creation with non-existent corequisite code (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS602',
          name: 'Network Protocols',
          credits: 3,
          corequisites: 'NONEXISTENT888'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/NONEXISTENT888/i);
    });

    test('rejects course creation when one of multiple prerequisite codes does not exist (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS603',
          name: 'Machine Learning',
          credits: 3,
          prerequisites: [['CS120', 'MISSING101']]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/MISSING101/i);
    });
  });

  describe('Self-Reference Validation (POST /api/courses)', () => {
    test('rejects course requiring itself as prerequisite (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS610',
          name: 'Self Dependent Course',
          credits: 3,
          prerequisites: 'CS610'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/itself|self/i);
    });

    test('rejects course corequisiting itself (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS611',
          name: 'Self Corequisite Course',
          credits: 3,
          corequisites: 'CS611'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/itself|self/i);
    });

    test('rejects self-reference with whitespace and case variations (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'cs 612',
          name: 'Self Case Course',
          credits: 3,
          prerequisites: 'CS612'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/itself|self/i);
    });

    test('rejects self-reference embedded in compound DNF clause (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS613',
          name: 'Compound Self Course',
          credits: 3,
          prerequisites: '(CS120 AND CS613) OR MATH101'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/itself|self/i);
    });
  });

  describe('Prerequisite Cycle Prevention (POST /api/courses)', () => {
    test('rejects direct 2-hop prerequisite cycle (A requires B, B requires A) (400 Bad Request)', async () => {
      // Seed course CYCLEA requiring CYCLEB with skipValidation: true
      await Course.create({
        code: 'CYCLEA',
        name: 'Cycle Course A',
        credits: 3,
        prerequisites: [['CYCLEB']],
        corequisites: []
      }, { skipValidation: true });

      // Now attempt to create CYCLEB requiring CYCLEA via POST /api/courses
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CYCLEB',
          name: 'Cycle Course B',
          credits: 3,
          prerequisites: 'CYCLEA'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/cycle/i);
    });

    test('rejects multi-hop 3-node prerequisite cycle (A -> B -> C -> A) (400 Bad Request)', async () => {
      // Seed MHA requiring MHB and MHB requiring MHC
      await Course.create({
        code: 'MHA',
        name: 'Multi-Hop Course A',
        credits: 3,
        prerequisites: [['MHB']],
        corequisites: []
      }, { skipValidation: true });

      await Course.create({
        code: 'MHB',
        name: 'Multi-Hop Course B',
        credits: 3,
        prerequisites: [['MHC']],
        corequisites: []
      }, { skipValidation: true });

      // Now attempt to create MHC requiring MHA
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'MHC',
          name: 'Multi-Hop Course C',
          credits: 3,
          prerequisites: 'MHA'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/cycle/i);
    });
  });

  describe('Mutual Corequisites Support (POST /api/courses and bulkCreate)', () => {
    test('permits creating a course with corequisite referencing existing course (201 Created)', async () => {
      // PHYS200 is in the catalog from initialCourses
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'PHYS200L',
          name: 'General Physics Lab',
          credits: 1,
          description: 'Hands-on lab experiments in mechanics and thermodynamics.',
          prerequisites: [],
          corequisites: 'PHYS200'
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('PHYS200L');
      expect(res.body.corequisites).toEqual([['PHYS200']]);
    });

    test('permits mutual corequisites between distinct courses in bulkCreate', async () => {
      const mutualBatch = [
        {
          code: 'BIO200',
          name: 'Cell Biology Lecture',
          credits: 3,
          prerequisites: [],
          corequisites: [['BIO200L']]
        },
        {
          code: 'BIO200L',
          name: 'Cell Biology Lab',
          credits: 1,
          prerequisites: [],
          corequisites: [['BIO200']]
        }
      ];

      const created = await Course.bulkCreate(mutualBatch);
      expect(created).toHaveLength(2);

      const bioLecture = await Course.findOne({ where: { code: 'BIO200' } });
      const bioLab = await Course.findOne({ where: { code: 'BIO200L' } });
      expect(bioLecture.corequisites).toEqual([['BIO200L']]);
      expect(bioLab.corequisites).toEqual([['BIO200']]);
    });
  });

  describe('Batch-Aware Seeding and Model BulkCreate', () => {
    test('seeds initialCourses cleanly regardless of declaration order (e.g. CS350 requiring CS240)', async () => {
      // Clear DB
      await sequelize.sync({ force: true });

      // Run bulkCreate with initialCourses
      const seeded = await Course.bulkCreate(initialCourses);
      expect(seeded.length).toBe(initialCourses.length);

      // Verify CS350 and CS240 are present and referentially valid
      const cs350 = await Course.findOne({ where: { code: 'CS350' } });
      const cs240 = await Course.findOne({ where: { code: 'CS240' } });
      expect(cs350).toBeDefined();
      expect(cs240).toBeDefined();
      expect(cs350.prerequisites).toEqual([['CS220', 'CS240']]);
    });

    test('setup.js completes database seeding cleanly', async () => {
      const setup = require('../setup');
      const result = await setup();
      expect(result).toBe(true);

      const count = await Course.count();
      expect(count).toBe(initialCourses.length);
    });

    test('bulkCreate rejects batch containing non-existent referenced courses', async () => {
      const invalidBatch = [
        {
          code: 'TEST101',
          name: 'Test 101',
          credits: 3,
          prerequisites: [['MISSING999']],
          corequisites: []
        }
      ];

      await expect(Course.bulkCreate(invalidBatch)).rejects.toThrow(/does not exist/i);
    });

    test('bulkCreate rejects batch containing self-references', async () => {
      const selfRefBatch = [
        {
          code: 'SELF101',
          name: 'Self 101',
          credits: 3,
          prerequisites: [['SELF101']],
          corequisites: []
        }
      ];

      await expect(Course.bulkCreate(selfRefBatch)).rejects.toThrow(/itself|self/i);
    });

    test('bulkCreate rejects batch containing prerequisite cycles', async () => {
      const cyclicBatch = [
        {
          code: 'CYCLEX',
          name: 'Cycle X',
          credits: 3,
          prerequisites: [['CYCLEY']],
          corequisites: []
        },
        {
          code: 'CYCLEY',
          name: 'Cycle Y',
          credits: 3,
          prerequisites: [['CYCLEX']],
          corequisites: []
        }
      ];

      await expect(Course.bulkCreate(cyclicBatch)).rejects.toThrow(/cycle/i);
    });
  });
});
