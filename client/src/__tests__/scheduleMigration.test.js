import { describe, it, expect } from 'vitest';
import {
  createEmptySchedule,
  migrateSchedule,
  validateSchedule,
  calculateTotalCredits,
  isLegacySchedule
} from '../utils/scheduleMigration';

describe('scheduleMigration utils', () => {
  const legacyEmpty = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []));

  const legacyWithCourses = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => []));
  legacyWithCourses[0][0] = [
    { code: 'CS101', name: 'Intro CS', credits: 3 }
  ];

  const modernSchedule = {
    transferCourses: [
      { code: 'AP-CALC', name: 'AP Calc', credits: 4, isTransfer: true }
    ],
    years: [
      [[{ code: 'CS101', name: 'Intro CS', credits: 3 }], [], []],
      [[], [], []],
      [[], [], []],
      [[], [], []]
    ]
  };

  it('createEmptySchedule returns correct object structure', () => {
    const empty = createEmptySchedule();
    expect(empty).toHaveProperty('transferCourses');
    expect(empty.transferCourses).toEqual([]);
    expect(empty).toHaveProperty('years');
    expect(empty.years).toHaveLength(4);
    expect(empty.years[0]).toHaveLength(3);
  });

  it('isLegacySchedule detects 4x3 array correctly', () => {
    expect(isLegacySchedule(legacyEmpty)).toBe(true);
    expect(isLegacySchedule(modernSchedule)).toBe(false);
    expect(isLegacySchedule(null)).toBe(false);
  });

  it('migrateSchedule migrates legacy 4x3 array into object schema with empty transferCourses', () => {
    const migrated = migrateSchedule(legacyWithCourses);
    expect(migrated.transferCourses).toEqual([]);
    expect(migrated.years[0][0][0].code).toBe('CS101');
    expect(migrated.years.length).toBe(4);
  });

  it('migrateSchedule preserves existing modern object schema', () => {
    const migrated = migrateSchedule(modernSchedule);
    expect(migrated.transferCourses).toHaveLength(1);
    expect(migrated.transferCourses[0].code).toBe('AP-CALC');
    expect(migrated.years[0][0][0].code).toBe('CS101');
  });

  it('validateSchedule accepts legacy 4x3 array', () => {
    expect(validateSchedule(legacyWithCourses)).toBeNull();
  });

  it('validateSchedule accepts modern object schema with transferCourses and years', () => {
    expect(validateSchedule(modernSchedule)).toBeNull();
  });

  it('validateSchedule rejects invalid schema', () => {
    expect(validateSchedule({ years: [] })).toBeTruthy();
    expect(validateSchedule("invalid string")).toBeTruthy();
    expect(validateSchedule(null)).toBeTruthy();
  });

  it('calculateTotalCredits sums courses in both transferCourses and years', () => {
    expect(calculateTotalCredits(modernSchedule)).toBe(7);
  });

  it('calculateTotalCredits handles legacy schedule', () => {
    expect(calculateTotalCredits(legacyWithCourses)).toBe(3);
  });
});
