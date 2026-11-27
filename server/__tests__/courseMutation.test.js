const request = require('supertest');
const app = require('../index');
const { sequelize, Course } = require('../db');
const initialCourses = require('../initialCourses');

describe('Catalog Course Mutation Integration Tests (Ticket #32: PUT & DELETE)', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(initialCourses);
  });

  describe('DELETE /api/courses/:id - Restrictive Deletion', () => {
    test('rejects deleting a course that has prerequisite dependents (409 Conflict)', async () => {
      // In initialCourses: CS120 is required by CS220 and CS240
      const res = await request(app).delete('/api/courses/CS120');

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/CS120/i);
      expect(res.body.dependents).toBeDefined();

      const dependentCodes = res.body.dependents.map(d => (typeof d === 'string' ? d : d.code));
      expect(dependentCodes).toContain('CS220');
      expect(dependentCodes).toContain('CS240');

      // Verify course still exists in catalog
      const checkRes = await request(app).get('/api/courses');
      const codes = checkRes.body.map(c => c.code);
      expect(codes).toContain('CS120');
    });

    test('rejects deleting a course that has corequisite dependents (409 Conflict)', async () => {
      // In initialCourses: MATH101 is required as corequisite by PHYS200 (and prereq by MATH215)
      const res = await request(app).delete('/api/courses/MATH101');

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.dependents).toBeDefined();

      const dependentCodes = res.body.dependents.map(d => (typeof d === 'string' ? d : d.code));
      expect(dependentCodes).toContain('PHYS200');
    });

    test('rejects deleting a course by numeric database primary key id if it has dependents (409 Conflict)', async () => {
      // CS120 has id: 1
      const res = await request(app).delete('/api/courses/1');

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.dependents).toBeDefined();
      const dependentCodes = res.body.dependents.map(d => (typeof d === 'string' ? d : d.code));
      expect(dependentCodes).toContain('CS220');
    });

    test('supports /courses/:id route alias without /api prefix for deletion', async () => {
      const res = await request(app).delete('/courses/CS120');

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    test('successfully deletes an independent course with no dependents (200 OK or 204)', async () => {
      // In initialCourses: ART110 has no dependents
      const res = await request(app).delete('/api/courses/ART110');

      expect([200, 204]).toContain(res.status);

      // Verify it disappears from GET /api/courses
      const checkRes = await request(app).get('/api/courses');
      const codes = checkRes.body.map(c => c.code);
      expect(codes).not.toContain('ART110');
    });

    test('successfully deletes an independent course using its numeric id', async () => {
      // ART110 has id: 7
      const res = await request(app).delete('/api/courses/7');

      expect([200, 204]).toContain(res.status);

      const checkRes = await request(app).get('/api/courses');
      const codes = checkRes.body.map(c => c.code);
      expect(codes).not.toContain('ART110');
    });

    test('returns 404 Not Found when attempting to delete a non-existent course', async () => {
      const res = await request(app).delete('/api/courses/NONEXISTENT999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/courses/:id - Restrictive Code Update and Attribute Updates', () => {
    test('rejects renaming a course code that has downstream dependents (409 Conflict)', async () => {
      // CS120 is required by CS220 and CS240
      const res = await request(app)
        .put('/api/courses/CS120')
        .send({
          code: 'CS125',
          name: 'Intro to Python and Programming'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toMatch(/CS120/i);
      expect(res.body.dependents).toBeDefined();

      const dependentCodes = res.body.dependents.map(d => (typeof d === 'string' ? d : d.code));
      expect(dependentCodes).toContain('CS220');
      expect(dependentCodes).toContain('CS240');

      // Verify original code CS120 remains unchanged
      const checkRes = await request(app).get('/api/courses');
      const codes = checkRes.body.map(c => c.code);
      expect(codes).toContain('CS120');
      expect(codes).not.toContain('CS125');
    });

    test('rejects renaming by numeric id when course has downstream dependents (409 Conflict)', async () => {
      // CS120 has id: 1
      const res = await request(app)
        .put('/api/courses/1')
        .send({
          code: 'CS199'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.dependents).toBeDefined();
    });

    test('successfully updates non-code attributes (name, credits, description) of a course with dependents (200 OK)', async () => {
      const res = await request(app)
        .put('/api/courses/CS120')
        .send({
          name: 'Foundations of Computer Programming',
          credits: 1.5,
          description: 'Updated comprehensive description of programming in Python.'
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('CS120');
      expect(res.body.name).toBe('Foundations of Computer Programming');
      expect(res.body.credits).toBe(1.5);
      expect(res.body.description).toBe('Updated comprehensive description of programming in Python.');

      // Verify persistence in GET /api/courses
      const checkRes = await request(app).get('/api/courses');
      const cs120 = checkRes.body.find(c => c.code === 'CS120');
      expect(cs120.name).toBe('Foundations of Computer Programming');
      expect(cs120.credits).toBe(1.5);
    });

    test('successfully renames an independent course with no downstream dependents (200 OK)', async () => {
      // ART110 has no dependents
      const res = await request(app)
        .put('/api/courses/ART110')
        .send({
          code: 'ART115',
          name: 'Digital Photography and Media'
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('ART115');
      expect(res.body.name).toBe('Digital Photography and Media');

      // Verify GET /api/courses reflects the rename
      const checkRes = await request(app).get('/api/courses');
      const codes = checkRes.body.map(c => c.code);
      expect(codes).toContain('ART115');
      expect(codes).not.toContain('ART110');
    });

    test('supports /courses/:id route alias without /api prefix for updating', async () => {
      const res = await request(app)
        .put('/courses/ART110')
        .send({
          name: 'Updated Art Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Art Name');
    });

    test('rejects renaming a course to a code that already exists in the catalog (400 Bad Request)', async () => {
      // Attempt to rename ART110 to CS120
      const res = await request(app)
        .put('/api/courses/ART110')
        .send({
          code: 'CS120'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    test('rejects updating with an invalid course code format (400 Bad Request)', async () => {
      const res = await request(app)
        .put('/api/courses/ART110')
        .send({
          code: 'INVALID@CODE!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects updating with empty course name or negative credits (400 Bad Request)', async () => {
      const resEmptyName = await request(app)
        .put('/api/courses/ART110')
        .send({
          name: '   '
        });
      expect(resEmptyName.status).toBe(400);

      const resNegCredits = await request(app)
        .put('/api/courses/ART110')
        .send({
          credits: -1
        });
      expect(resNegCredits.status).toBe(400);
    });

    test('rejects updating requirements with non-existent course codes (400 Bad Request)', async () => {
      const res = await request(app)
        .put('/api/courses/ART110')
        .send({
          prerequisites: 'NONEXISTENT999'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/NONEXISTENT999/i);
    });

    test('rejects updating requirements to create self-reference (400 Bad Request)', async () => {
      const resPrereq = await request(app)
        .put('/api/courses/ART110')
        .send({
          prerequisites: 'ART110'
        });
      expect(resPrereq.status).toBe(400);
      expect(resPrereq.body.error).toMatch(/cannot require itself/i);

      const resCoreq = await request(app)
        .put('/api/courses/ART110')
        .send({
          corequisites: 'ART110'
        });
      expect(resCoreq.status).toBe(400);
      expect(resCoreq.body.error).toMatch(/cannot corequisite itself/i);
    });

    test('rejects updating requirements to introduce a prerequisite cycle (400 Bad Request)', async () => {
      // CS220 requires CS120. If CS120 sets CS220 as prerequisite -> cycle CS120 -> CS220 -> CS120!
      const res = await request(app)
        .put('/api/courses/CS120')
        .send({
          prerequisites: 'CS220'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cycle detected/i);
    });

    test('successfully updates non-breaking requirements with valid codes (200 OK)', async () => {
      // Add valid prerequisite CS120 and corequisite MATH101 to ART110
      const res = await request(app)
        .put('/api/courses/ART110')
        .send({
          prerequisites: 'CS120',
          corequisites: 'MATH101'
        });

      expect(res.status).toBe(200);
      expect(res.body.prerequisites).toEqual([['CS120']]);
      expect(res.body.corequisites).toEqual([['MATH101']]);

      // Verify persisted in GET /api/courses
      const checkRes = await request(app).get('/api/courses');
      const art = checkRes.body.find(c => c.code === 'ART110');
      expect(art.prerequisites).toEqual([['CS120']]);
      expect(art.corequisites).toEqual([['MATH101']]);
    });

    test('returns 404 Not Found when attempting to update a non-existent course', async () => {
      const res = await request(app)
        .put('/api/courses/NONEXISTENT999')
        .send({
          name: 'Ghost Course'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
