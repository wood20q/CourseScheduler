const request = require('supertest');
const app = require('../index');
const { sequelize, Course } = require('../db');
const initialCourses = require('../initialCourses');

describe('Course Requirements and Canonicalization Integration Tests (Issue #30)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  describe('POST /api/courses - Valid Ingestion and Canonicalization', () => {
    test('creates course with structured DNF array and canonicalizes course codes', async () => {
      const payload = {
        code: '  cs 301 ',
        name: 'Advanced Algorithms',
        credits: 3,
        description: 'Deep dive into advanced algorithms and graphs.',
        prerequisites: [['cs 120', 'math 101'], ['cs 220']],
        corequisites: [['phys 200']]
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS301');
      expect(res.body.name).toBe('Advanced Algorithms');
      expect(res.body.credits).toBe(3);
      expect(res.body.prerequisites).toEqual([['CS120', 'MATH101'], ['CS220']]);
      expect(res.body.corequisites).toEqual([['PHYS200']]);

      // Verify persistence via GET /api/courses
      const getRes = await request(app).get('/api/courses');
      expect(getRes.status).toBe(200);
      const created = getRes.body.find(c => c.code === 'CS301');
      expect(created).toBeDefined();
      expect(created.prerequisites).toEqual([['CS120', 'MATH101'], ['CS220']]);
      expect(created.corequisites).toEqual([['PHYS200']]);
    });

    test('creates course with human-readable boolean string expression and normalizes to DNF', async () => {
      const payload = {
        code: 'cs 401',
        name: 'Distributed Systems',
        credits: 3,
        description: 'Consensus protocols and fault-tolerant architectures.',
        prerequisites: '(CS 120 AND MATH 101) OR CS 220',
        corequisites: 'PHYS 200'
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS401');
      expect(res.body.prerequisites).toEqual([['CS120', 'MATH101'], ['CS220']]);
      expect(res.body.corequisites).toEqual([['PHYS200']]);
    });

    test('accepts comma-separated and alternate boolean operators in string requirements', async () => {
      const payload = {
        code: 'cs 402',
        name: 'Cloud Computing',
        credits: 3,
        prerequisites: 'CS120, MATH101',
        corequisites: ''
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS402');
      expect(res.body.prerequisites).toEqual([['CS120', 'MATH101']]);
      expect(res.body.corequisites).toEqual([]);
    });

    test('accepts pipe | and ampersand & operators in string requirements', async () => {
      const payload = {
        code: 'cs 405',
        name: 'Compiler Design',
        credits: 3,
        prerequisites: 'CS120 & MATH101 | CS220',
        corequisites: null
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS405');
      expect(res.body.prerequisites).toEqual([['CS120', 'MATH101'], ['CS220']]);
      expect(res.body.corequisites).toEqual([]);
    });

    test('accepts flat array of course codes and converts to single AND DNF clause', async () => {
      const payload = {
        code: 'cs 403',
        name: 'Parallel Computing',
        credits: 3,
        prerequisites: ['cs 120', 'math 101'],
        corequisites: []
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS403');
      expect(res.body.prerequisites).toEqual([['CS120', 'MATH101']]);
      expect(res.body.corequisites).toEqual([]);
    });

    test('creates course with omitted requirements defaulting to empty DNF arrays', async () => {
      const payload = {
        code: 'cs 105',
        name: 'Intro to Computing',
        credits: 1
      };

      const res = await request(app)
        .post('/api/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS105');
      expect(res.body.prerequisites).toEqual([]);
      expect(res.body.corequisites).toEqual([]);
    });

    test('supports /courses endpoint path without /api prefix', async () => {
      const payload = {
        code: 'cs 106',
        name: 'Computing Seminar',
        credits: 1,
        prerequisites: 'CS105'
      };

      const res = await request(app)
        .post('/courses')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('CS106');
      expect(res.body.prerequisites).toEqual([['CS105']]);
    });
  });

  describe('POST /api/courses - Invalid Payload Rejection (400 Bad Request)', () => {
    test('rejects missing course code', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ name: 'No Code Course', credits: 3 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects blank course code', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: '   ', name: 'Blank Code', credits: 3 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects invalid characters in course code', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: 'CS@100', name: 'Invalid Symbol Code', credits: 3 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects missing course name', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: 'CS990', credits: 3 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects non-numeric credits', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: 'CS991', name: 'Invalid Credits Course', credits: 'not-a-number' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects negative credits', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: 'CS992', name: 'Negative Credits Course', credits: -1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects duplicate course code', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({ code: 'CS120', name: 'Duplicate Intro', credits: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/courses - Invalid Requirement Syntax Rejection (400 Bad Request)', () => {
    test('rejects unbalanced parentheses in string expression', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS501',
          name: 'Syntax Error 1',
          credits: 3,
          prerequisites: '(CS120 AND MATH101'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects dangling boolean operator in string expression', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS502',
          name: 'Syntax Error 2',
          credits: 3,
          prerequisites: 'CS120 AND'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects leading boolean operator in string expression', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS503',
          name: 'Syntax Error 3',
          credits: 3,
          prerequisites: 'OR CS120'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects consecutive boolean operators', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS504',
          name: 'Syntax Error 4',
          credits: 3,
          prerequisites: 'CS120 OR OR CS220'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects empty parentheses in expression', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS505',
          name: 'Syntax Error 5',
          credits: 3,
          prerequisites: '()'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects invalid characters in string expression', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS506',
          name: 'Syntax Error 6',
          credits: 3,
          prerequisites: 'CS120 @#$ MATH101'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects non-string non-array requirement types (number, object)', async () => {
      const resNumber = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS507',
          name: 'Type Error Number',
          credits: 3,
          prerequisites: 123
        });
      expect(resNumber.status).toBe(400);

      const resObject = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS508',
          name: 'Type Error Object',
          credits: 3,
          corequisites: { foo: 'bar' }
        });
      expect(resObject.status).toBe(400);
    });

    test('rejects deeply nested 3D array in requirement', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS509',
          name: 'Structure Error 3D',
          credits: 3,
          prerequisites: [[['CS120']]]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects array containing non-string course codes', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS510',
          name: 'Structure Error Non-string code',
          credits: 3,
          prerequisites: [[123]]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects array containing empty string or blank code', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS511',
          name: 'Structure Error Empty Code',
          credits: 3,
          prerequisites: [['']]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });

    test('rejects array containing empty clause', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          code: 'CS512',
          name: 'Structure Error Empty Clause',
          credits: 3,
          prerequisites: [['CS120'], []]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/syntax/i);
    });
  });

  describe('GET /api/courses - Standardized DNF Requirement Delivery', () => {
    test('delivers canonical DNF arrays across all returned courses', async () => {
      const res = await request(app).get('/api/courses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      for (const course of res.body) {
        expect(Array.isArray(course.prerequisites)).toBe(true);
        expect(Array.isArray(course.corequisites)).toBe(true);

        for (const clause of course.prerequisites) {
          expect(Array.isArray(clause)).toBe(true);
          for (const code of clause) {
            expect(typeof code).toBe('string');
            expect(code).toBe(code.toUpperCase().replace(/\s+/g, ''));
          }
        }

        for (const clause of course.corequisites) {
          expect(Array.isArray(clause)).toBe(true);
          for (const code of clause) {
            expect(typeof code).toBe('string');
            expect(code).toBe(code.toUpperCase().replace(/\s+/g, ''));
          }
        }
      }
    });
  });
});
