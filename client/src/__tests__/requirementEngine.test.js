import { describe, it, expect } from 'vitest';
import { 
  normalizeDNF, 
  evaluateDNF, 
  getAvailableCourseCodes, 
  validateSchedule 
} from '../utils/requirementEngine';

describe('Requirement Engine', () => {
  describe('normalizeDNF', () => {
    it('normalizes empty or null values', () => {
      expect(normalizeDNF(null)).toEqual([]);
      expect(normalizeDNF([])).toEqual([]);
      expect(normalizeDNF('')).toEqual([]);
    });

    it('normalizes flat array of courses into single AND clause', () => {
      expect(normalizeDNF(['cs120', 'math101'])).toEqual([['CS120', 'MATH101']]);
    });

    it('preserves array of arrays (DNF)', () => {
      expect(normalizeDNF([['MA101', 'MA105'], ['MA303', 'MA304']])).toEqual([
        ['MA101', 'MA105'],
        ['MA303', 'MA304']
      ]);
    });

    it('parses boolean string with AND and OR', () => {
      expect(normalizeDNF('(MA101 AND MA105) OR (MA303 AND MA304)')).toEqual([
        ['MA101', 'MA105'],
        ['MA303', 'MA304']
      ]);
    });
  });

  describe('evaluateDNF', () => {
    it('returns satisfied when no requirements are specified', () => {
      const res = evaluateDNF([], new Set());
      expect(res.isSatisfied).toBe(true);
      expect(res.status).toBe('SATISFIED');
    });

    it('evaluates AND clauses correctly', () => {
      const req = [['CS120', 'MATH101']];
      expect(evaluateDNF(req, new Set(['CS120'])).status).toBe('UNSATISFIED');
      expect(evaluateDNF(req, new Set(['CS120', 'MATH101'])).status).toBe('SATISFIED');
    });

    it('evaluates OR clauses correctly', () => {
      const req = [['MATH101'], ['MATH105']];
      expect(evaluateDNF(req, new Set(['MATH105'])).status).toBe('SATISFIED');
      expect(evaluateDNF(req, new Set(['CS120'])).status).toBe('UNSATISFIED');
    });

    it('handles explicit requirement waivers', () => {
      const req = [['CS120']];
      const res = evaluateDNF(req, new Set(), true);
      expect(res.isSatisfied).toBe(true);
      expect(res.isWaived).toBe(true);
      expect(res.status).toBe('WAIVED');
    });
  });

  describe('validateSchedule', () => {
    it('correctly tracks prior term requirements and flags unsatisfied courses', () => {
      const catalog = [
        { code: 'CS120', prerequisites: [] },
        { code: 'CS220', prerequisites: ['CS120'] }
      ];

      const schedule = {
        transferCourses: [],
        years: [
          [
            [{ code: 'CS220' }], // Term 1 (missing CS120!)
            [{ code: 'CS120' }], // Term 2 (CS120 taken AFTER CS220)
            []
          ],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };

      const result = validateSchedule(schedule, catalog);
      expect(result.summary.isValid).toBe(false);
      expect(result.summary.unsatisfiedCount).toBe(1);

      const cs220Diag = result.diagnostics.find(d => d.courseCode === 'CS220');
      expect(cs220Diag.overallStatus).toBe('UNSATISFIED');
      expect(cs220Diag.hasFlag).toBe(true);
    });

    it('allows concurrent term enrollment for corequisites', () => {
      const catalog = [
        { code: 'MATH101', corequisites: [] },
        { code: 'PHYS200', corequisites: ['MATH101'] }
      ];

      const schedule = {
        transferCourses: [],
        years: [
          [
            // Taken in same term
            [{ code: 'MATH101' }, { code: 'PHYS200' }],
            [],
            []
          ],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };

      const result = validateSchedule(schedule, catalog);
      expect(result.summary.isValid).toBe(true);
      const physDiag = result.diagnostics.find(d => d.courseCode === 'PHYS200');
      expect(physDiag.overallStatus).toBe('SATISFIED');
    });
  });
});
