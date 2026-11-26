import { describe, it, expect } from 'vitest';
import {
  createEmptySchedule,
  migrateSchedule,
  validateSchedule,
  calculateTotalCredits,
  calculateCredits,
  isLegacySchedule,
  parseLocation,
  formatLocationKey,
  isTransferLocation,
  addCourseToSchedule,
  removeCourseFromSchedule,
  moveCourseInSchedule,
  findCourseInSchedule,
  toggleCourseWaiver
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

  it('validateSchedule does not mutate the input schedule or course objects', () => {
    const course = Object.freeze({ code: 'CS101', name: 'Intro CS', credits: '3' });
    const immutableModernSchedule = Object.freeze({
      transferCourses: [course],
      years: [
        [[], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    });
    expect(() => validateSchedule(immutableModernSchedule)).not.toThrow();
    expect(validateSchedule(immutableModernSchedule)).toBeNull();
  });

  describe('calculateCredits and location utilities', () => {
    it('calculateCredits sums and rounds properly', () => {
      expect(calculateCredits([{ credits: 0.25 }, { credits: 0.75 }, { credits: 3 }])).toBe(4);
      expect(calculateCredits([{ credits: '1.5' }, { credits: 0.25 }])).toBe(1.75);
      expect(calculateCredits([])).toBe(0);
      expect(calculateCredits(null)).toBe(0);
    });

    it('parseLocation handles transfer, arrays, and csv strings', () => {
      expect(parseLocation('transfer')).toEqual({ type: 'transfer' });
      expect(parseLocation([1, 2])).toEqual({ type: 'term', year: 1, term: 2 });
      expect(parseLocation('2,1')).toEqual({ type: 'term', year: 2, term: 1 });
      expect(parseLocation(null)).toEqual({ type: 'transfer' });
    });

    it('formatLocationKey formats keys consistently', () => {
      expect(formatLocationKey('transfer')).toBe('transfer');
      expect(formatLocationKey([0, 1])).toBe('0,1');
      expect(formatLocationKey('0,1')).toBe('0,1');
    });

    it('isTransferLocation identifies transfer targets', () => {
      expect(isTransferLocation('transfer')).toBe(true);
      expect(isTransferLocation([0, 0])).toBe(false);
      expect(isTransferLocation('0,0')).toBe(false);
    });
  });

  describe('pure schedule state operations', () => {
    const baseSchedule = {
      transferCourses: [{ code: 'AP-CALC', name: 'Calc', credits: 4, isTransfer: true }],
      years: [
        [[{ code: 'CS101', name: 'Intro CS', credits: 3 }], [], []],
        [[], [], []],
        [[], [], []],
        [[], [], []]
      ]
    };

    it('removeCourseFromSchedule removes course from transfer or term without mutating input', () => {
      const removedTransfer = removeCourseFromSchedule(baseSchedule, 'AP-CALC');
      expect(removedTransfer.transferCourses).toHaveLength(0);
      expect(removedTransfer.years[0][0]).toHaveLength(1);
      expect(baseSchedule.transferCourses).toHaveLength(1);

      const removedTerm = removeCourseFromSchedule(baseSchedule, 'CS101');
      expect(removedTerm.years[0][0]).toHaveLength(0);
      expect(baseSchedule.years[0][0]).toHaveLength(1);
    });

    it('addCourseToSchedule adds course to transfer or specific term', () => {
      const newCourse = { code: 'CS120', name: 'Prog II', credits: 4 };
      const withTransfer = addCourseToSchedule(baseSchedule, newCourse, 'transfer');
      expect(withTransfer.transferCourses).toHaveLength(2);
      expect(withTransfer.transferCourses[1].code).toBe('CS120');

      const withTerm = addCourseToSchedule(baseSchedule, newCourse, [2, 1]);
      expect(withTerm.years[2][1]).toHaveLength(1);
      expect(withTerm.years[2][1][0].code).toBe('CS120');
    });

    it('moveCourseInSchedule moves course between sections', () => {
      const movedToTerm = moveCourseInSchedule(baseSchedule, 'AP-CALC', [1, 0]);
      expect(movedToTerm.transferCourses).toHaveLength(0);
      expect(movedToTerm.years[1][0]).toHaveLength(1);
      expect(movedToTerm.years[1][0][0].code).toBe('AP-CALC');

      const movedToTransfer = moveCourseInSchedule(baseSchedule, 'CS101', 'transfer');
      expect(movedToTransfer.years[0][0]).toHaveLength(0);
      expect(movedToTransfer.transferCourses).toHaveLength(2);
    });

    it('findCourseInSchedule locates courses in transfer and terms', () => {
      const foundTransfer = findCourseInSchedule(baseSchedule, 'AP-CALC');
      expect(foundTransfer).not.toBeNull();
      expect(foundTransfer.location.type).toBe('transfer');
      expect(foundTransfer.locationLabel).toBe('Pre-College / Transfer Credits');

      const foundTerm = findCourseInSchedule(baseSchedule, 'CS101');
      expect(foundTerm).not.toBeNull();
      expect(foundTerm.location.type).toBe('term');
      expect(foundTerm.location.year).toBe(0);
      expect(foundTerm.location.term).toBe(0);
      expect(foundTerm.locationLabel).toBe('Year 1 Term 1');

      expect(findCourseInSchedule(baseSchedule, 'NON-EXISTENT')).toBeNull();
    });

    describe('toggleCourseWaiver', () => {
      const scheduleWithCourses = {
        transferCourses: [{ code: 'AP-CALC', name: 'Calc', credits: 4, isTransfer: true }],
        years: [
          [[{ code: 'CS101', name: 'Intro CS', credits: 3 }, { code: 'MATH101', name: 'Calculus I', credits: 4 }], [], []],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };

      it('toggles isWaived on a target course located in transferCourses', () => {
        const waived = toggleCourseWaiver(scheduleWithCourses, 'AP-CALC');
        expect(waived.transferCourses[0].isWaived).toBe(true);

        const unWaived = toggleCourseWaiver(waived, 'AP-CALC');
        expect(unWaived.transferCourses[0].isWaived).toBe(false);
      });

      it('toggles isWaived on a target course located in an academic year/term', () => {
        const waived = toggleCourseWaiver(scheduleWithCourses, 'CS101');
        expect(waived.years[0][0][0].isWaived).toBe(true);
        expect(waived.years[0][0][1].isWaived).toBeUndefined();

        const unWaived = toggleCourseWaiver(waived, 'CS101');
        expect(unWaived.years[0][0][0].isWaived).toBe(false);
      });

      it('matches course codes case-insensitively and with trimmed whitespace', () => {
        const waivedTransfer = toggleCourseWaiver(scheduleWithCourses, '  ap-calc  ');
        expect(waivedTransfer.transferCourses[0].isWaived).toBe(true);

        const waivedTerm = toggleCourseWaiver(scheduleWithCourses, '  cs101 \n');
        expect(waivedTerm.years[0][0][0].isWaived).toBe(true);
      });

      it('leaves other courses untouched and returns a new schedule object (immutability)', () => {
        const frozenSchedule = Object.freeze({
          transferCourses: Object.freeze([Object.freeze({ code: 'AP-CALC', name: 'Calc', credits: 4 })]),
          years: Object.freeze([
            Object.freeze([
              Object.freeze([Object.freeze({ code: 'CS101', name: 'Intro CS', credits: 3 })]),
              Object.freeze([]),
              Object.freeze([])
            ]),
            Object.freeze([Object.freeze([]), Object.freeze([]), Object.freeze([])]),
            Object.freeze([Object.freeze([]), Object.freeze([]), Object.freeze([])]),
            Object.freeze([Object.freeze([]), Object.freeze([]), Object.freeze([])])
          ])
        });

        const updated = toggleCourseWaiver(frozenSchedule, 'CS101');
        expect(updated).not.toBe(frozenSchedule);
        expect(updated.years).not.toBe(frozenSchedule.years);
        expect(updated.years[0][0][0].isWaived).toBe(true);
        expect(frozenSchedule.years[0][0][0].isWaived).toBeUndefined();
        expect(updated.transferCourses[0]).toEqual(frozenSchedule.transferCourses[0]);
      });
    });
  });
});
