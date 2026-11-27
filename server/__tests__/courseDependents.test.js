const request = require('supertest');
const app = require('../index');
const { sequelize, Course } = require('../db');
const initialCourses = require('../initialCourses');

describe('Reverse Dependency Lookup API (Ticket #33: GET /api/courses/:code/dependents)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  describe('GET /api/courses/:code/dependents', () => {
    test('returns 404 Not Found if course does not exist in the catalog', async () => {
      const res = await request(app).get('/api/courses/NONEXISTENT999/dependents');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/not found/i);
    });

    test('returns 200 OK with an empty array when course exists but has no dependents', async () => {
      // In initialCourses: ART110 is an elective with no dependents
      const res = await request(app).get('/api/courses/ART110/dependents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
      expect(res.body).toHaveLength(0);
    });

    test('returns 200 OK with prerequisite dependents for course required downstream', async () => {
      // In initialCourses: CS120 is required by CS220 and CS240 as a prerequisite
      const res = await request(app).get('/api/courses/CS120/dependents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const codes = res.body.map(d => d.code);
      expect(codes).toContain('CS220');
      expect(codes).toContain('CS240');

      for (const dep of res.body) {
        expect(dep.id).toBeDefined();
        expect(dep.name).toBeDefined();
        expect(dep.type).toBe('prerequisite');
        expect(dep.isPrerequisite).toBe(true);
        expect(dep.isCorequisite).toBe(false);
      }

      const cs220 = res.body.find(d => d.code === 'CS220');
      expect(cs220.name).toBe('Data Structures and Algorithms');

      const cs240 = res.body.find(d => d.code === 'CS240');
      expect(cs240.name).toBe('Cybersecurity Fundamentals');
    });

    test('returns 200 OK distinguishing corequisite from prerequisite dependents', async () => {
      // In initialCourses: MATH101 is required as corequisite by PHYS200 and as prerequisite by MATH215
      const res = await request(app).get('/api/courses/MATH101/dependents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);

      const phys200 = res.body.find(d => d.code === 'PHYS200');
      expect(phys200).toBeDefined();
      expect(phys200.name).toBe('General Physics');
      expect(phys200.type).toBe('corequisite');
      expect(phys200.isCorequisite).toBe(true);
      expect(phys200.isPrerequisite).toBe(false);

      const math215 = res.body.find(d => d.code === 'MATH215');
      expect(math215).toBeDefined();
      expect(math215.name).toBe('Linear Algebra');
      expect(math215.type).toBe('prerequisite');
      expect(math215.isPrerequisite).toBe(true);
      expect(math215.isCorequisite).toBe(false);
    });

    test('canonicalizes course code in URL parameter (lowercase, whitespace, urlencoded)', async () => {
      // Test lowercase without spaces
      const resLower = await request(app).get('/api/courses/cs120/dependents');
      expect(resLower.status).toBe(200);
      expect(resLower.body.map(d => d.code)).toEqual(expect.arrayContaining(['CS220', 'CS240']));

      // Test URL-encoded space "cs 120"
      const resSpace = await request(app).get('/api/courses/cs%20120/dependents');
      expect(resSpace.status).toBe(200);
      expect(resSpace.body.map(d => d.code)).toEqual(expect.arrayContaining(['CS220', 'CS240']));

      // Test mixed case with multiple spaces "mAth  101"
      const resMixed = await request(app).get('/api/courses/mAth%20%20101/dependents');
      expect(resMixed.status).toBe(200);
      expect(resMixed.body.map(d => d.code)).toEqual(expect.arrayContaining(['PHYS200', 'MATH215']));
    });

    test('supports /courses/:code/dependents route alias without /api prefix', async () => {
      const res = await request(app).get('/courses/CS120/dependents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.map(d => d.code)).toEqual(expect.arrayContaining(['CS220', 'CS240']));
    });

    test('supports lookup by numeric database primary key id', async () => {
      // In initialCourses: CS120 has id: 1
      const res = await request(app).get('/api/courses/1/dependents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.map(d => d.code)).toEqual(expect.arrayContaining(['CS220', 'CS240']));
    });

    test('categorizes dependent course as type "both" when required as both prerequisite and corequisite', async () => {
      // Add a course that lists PHYS100 as both prerequisite and corequisite
      await Course.create({
        code: 'PHYS100',
        name: 'Basic Physics',
        credits: 1,
        description: 'Basics',
        prerequisites: [],
        corequisites: []
      });

      await Course.create({
        code: 'PHYS100L',
        name: 'Physics Lab',
        credits: 0.5,
        description: 'Lab requiring PHYS100 as prereq and coreq',
        prerequisites: [['PHYS100']],
        corequisites: [['PHYS100']]
      });

      const res = await request(app).get('/api/courses/PHYS100/dependents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe('PHYS100L');
      expect(res.body[0].type).toBe('both');
      expect(res.body[0].isPrerequisite).toBe(true);
      expect(res.body[0].isCorequisite).toBe(true);
    });

    test('reflects newly created courses dynamically in reverse dependency lookups', async () => {
      // Dynamically create a new advanced course that requires CS350
      const createRes = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS490',
          name: 'Capstone Project',
          credits: 1,
          description: 'Senior project',
          prerequisites: 'CS350',
          corequisites: []
        });
      expect(createRes.status).toBe(201);

      // Verify CS350 now lists CS490 as a dependent
      const res = await request(app).get('/api/courses/CS350/dependents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const codes = res.body.map(d => d.code);
      expect(codes).toContain('CS490');
      const cs490Dep = res.body.find(d => d.code === 'CS490');
      expect(cs490Dep.name).toBe('Capstone Project');
      expect(cs490Dep.type).toBe('prerequisite');
    });
  });
});
