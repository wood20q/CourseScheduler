const { addCourse, findCourse, removeCourse, moveCourse } = require('../scheduleService');
const request = require('supertest');
const app = require('../index');

describe('Schedule Schema Upgrade ({ transferCourses, years })', () => {
  const createEmptyUpgradedSchedule = () => ({
    transferCourses: [],
    years: Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []))
  });

  const sampleCourse = {
    code: 'CS101',
    name: 'Intro to Computer Science',
    credits: 3,
    description: 'Basic programming'
  };

  const sampleTransferCourse = {
    code: 'AP-CALC',
    name: 'AP Calculus BC',
    credits: 4,
    institution: 'College Board',
    description: 'AP Credit',
    isTransfer: true
  };

  test('addCourse adds a course to years when given [yearIndex, termIndex]', () => {
    const schedule = createEmptyUpgradedSchedule();
    const updated = addCourse([0, 1], sampleCourse, schedule);

    expect(updated.years[0][1]).toHaveLength(1);
    expect(updated.years[0][1][0].code).toBe('CS101');
    expect(updated.transferCourses).toHaveLength(0);
    // original immutability
    expect(schedule.years[0][1]).toHaveLength(0);
  });

  test('addCourse adds a transfer course to transferCourses when given "transfer"', () => {
    const schedule = createEmptyUpgradedSchedule();
    const updated = addCourse('transfer', sampleTransferCourse, schedule);

    expect(updated.transferCourses).toHaveLength(1);
    expect(updated.transferCourses[0].code).toBe('AP-CALC');
    expect(updated.years.flat(2)).toHaveLength(0);
  });

  test('findCourse finds a course in years', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse([1, 2], sampleCourse, schedule);

    const location = findCourse('CS101', schedule);
    expect(location).toEqual([1, 2, 0]);
  });

  test('findCourse finds a course in transferCourses', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse('transfer', sampleTransferCourse, schedule);

    const location = findCourse('AP-CALC', schedule);
    expect(location).toEqual(['transfer', 0]);
  });

  test('removeCourse removes a course from years', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse([0, 0], sampleCourse, schedule);
    const updated = removeCourse('CS101', schedule);

    expect(updated.years[0][0]).toHaveLength(0);
  });

  test('removeCourse removes a course from transferCourses', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse('transfer', sampleTransferCourse, schedule);
    const updated = removeCourse('AP-CALC', schedule);

    expect(updated.transferCourses).toHaveLength(0);
  });

  test('moveCourse moves a course from transferCourses to a year term', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse('transfer', sampleTransferCourse, schedule);
    const updated = moveCourse([2, 1], 'AP-CALC', schedule);

    expect(updated.transferCourses).toHaveLength(0);
    expect(updated.years[2][1]).toHaveLength(1);
    expect(updated.years[2][1][0].code).toBe('AP-CALC');
  });

  test('moveCourse moves a course from a year term to transferCourses', () => {
    let schedule = createEmptyUpgradedSchedule();
    schedule = addCourse([1, 0], sampleTransferCourse, schedule);
    const updated = moveCourse('transfer', 'AP-CALC', schedule);

    expect(updated.years[1][0]).toHaveLength(0);
    expect(updated.transferCourses).toHaveLength(1);
    expect(updated.transferCourses[0].code).toBe('AP-CALC');
  });

  test('preserves backward compatibility when schedule is legacy 4x3 array', () => {
    const legacySchedule = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []));
    const updated = addCourse([0, 0], sampleCourse, legacySchedule);

    expect(Array.isArray(updated)).toBe(true);
    expect(updated[0][0][0].code).toBe('CS101');
  });
});

describe('Catalog API Requirements Schema (/api/courses) - Issue #27', () => {
  test('delivers course objects with prerequisites and corequisites defined on courses', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const cs220 = res.body.find(c => c.code === 'CS220');
    expect(cs220).toBeDefined();
    expect(cs220.prerequisites).toEqual([['CS120']]);
    expect(cs220.corequisites).toEqual([]);

    const cs240 = res.body.find(c => c.code === 'CS240');
    expect(cs240).toBeDefined();
    expect(cs240.prerequisites).toEqual([['CS120']]);
    expect(cs240.corequisites).toEqual([]);

    const cs350 = res.body.find(c => c.code === 'CS350');
    expect(cs350).toBeDefined();
    expect(cs350.prerequisites).toEqual([['CS220', 'CS240']]);
    expect(cs350.corequisites).toEqual([]);

    const cs310 = res.body.find(c => c.code === 'CS310');
    expect(cs310).toBeDefined();
    expect(cs310.prerequisites).toEqual([['CS220']]);
    expect(cs310.corequisites).toEqual([]);

    const math215 = res.body.find(c => c.code === 'MATH215');
    expect(math215).toBeDefined();
    expect(math215.prerequisites).toEqual([['MATH101']]);
    expect(math215.corequisites).toEqual([]);

    const phys200 = res.body.find(c => c.code === 'PHYS200');
    expect(phys200).toBeDefined();
    expect(phys200.prerequisites).toEqual([]);
    expect(phys200.corequisites).toEqual([['MATH101']]);

    const cs120 = res.body.find(c => c.code === 'CS120');
    expect(cs120).toBeDefined();
    expect(cs120.prerequisites).toEqual([]);
    expect(cs120.corequisites).toEqual([]);
  });
});
