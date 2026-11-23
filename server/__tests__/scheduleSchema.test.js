const { addCourse, findCourse, removeCourse, moveCourse } = require('../scheduleService');

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

  test('addCourse adds a transfer course to transferCourses when given "transfer" or [-1, -1]', () => {
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
