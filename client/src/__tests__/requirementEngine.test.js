import { describe, it, expect } from 'vitest';
import * as requirementEngine from '../utils/requirementEngine';
import { 
  normalizeDNF, 
  evaluateDNF, 
  validateSchedule, 
  simulateScheduleMutation, 
  canonicalizeCode 
} from '../utils/requirementEngine';

describe('Requirement Engine', () => {
  it('does not export canonicalizeCourseCode alias', () => {
    expect(requirementEngine.canonicalizeCourseCode).toBeUndefined();
  });
  describe('canonicalizeCode', () => {
    it('removes inner whitespace between letters and digits and trims/uppercases', () => {
      expect(canonicalizeCode('MA 101')).toBe('MA101');
      expect(canonicalizeCode('CS 120')).toBe('CS120');
      expect(canonicalizeCode('  cs   120  ')).toBe('CS120');
      expect(canonicalizeCode('MATH 101-B')).toBe('MATH101-B');
      expect(canonicalizeCode('')).toBe('');
      expect(canonicalizeCode(null)).toBe('');
    });
  });

  describe('normalizeDNF', () => {
    it('normalizes empty or null values', () => {
      expect(normalizeDNF(null)).toEqual([]);
      expect(normalizeDNF([])).toEqual([]);
      expect(normalizeDNF('')).toEqual([]);
    });

    it('normalizes flat array of courses into single AND clause', () => {
      expect(normalizeDNF(['cs120', 'math101'])).toEqual([['CS120', 'MATH101']]);
    });

    it('canonicalizes course codes with inner whitespace in flat arrays', () => {
      expect(normalizeDNF(['MA 101', 'CS 120'])).toEqual([['MA101', 'CS120']]);
    });

    it('preserves array of arrays (DNF)', () => {
      expect(normalizeDNF([['MA101', 'MA105'], ['MA303', 'MA304']])).toEqual([
        ['MA101', 'MA105'],
        ['MA303', 'MA304']
      ]);
    });

    it('canonicalizes course codes with inner whitespace in DNF array of arrays', () => {
      expect(normalizeDNF([['MA 101', 'MA 105'], ['MA 303', 'MA 304']])).toEqual([
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

    it('canonicalizes course codes with inner whitespace in boolean string expressions', () => {
      expect(normalizeDNF('(MA 101 AND MA 105) OR (MA 303 AND MA 304)')).toEqual([
        ['MA101', 'MA105'],
        ['MA303', 'MA304']
      ]);
      expect(normalizeDNF('CS 120')).toEqual([['CS120']]);
      expect(normalizeDNF('(CS 120 AND MATH 101) OR CS 220')).toEqual([
        ['CS120', 'MATH101'],
        ['CS220']
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

    it('handles explicit requirement waivers and preserves unfulfilledSummary', () => {
      const req = [['CS120']];
      const res = evaluateDNF(req, new Set(), true);
      expect(res.isSatisfied).toBe(true);
      expect(res.isWaived).toBe(true);
      expect(res.status).toBe('WAIVED');
      expect(res.unfulfilledSummary).toBe('CS120');
    });

    it('reliably matches spaced requirement strings against compact satisfied codes', () => {
      const req = '(MA 101 AND MA 105) OR (MA 303 AND MA 304)';
      const res1 = evaluateDNF(req, new Set(['MA101', 'MA105']));
      expect(res1.isSatisfied).toBe(true);
      expect(res1.status).toBe('SATISFIED');
      expect(res1.options[0].isSatisfied).toBe(true);
      expect(res1.options[0].required).toEqual(['MA101', 'MA105']);

      const res2 = evaluateDNF(req, new Set(['MA101']));
      expect(res2.isSatisfied).toBe(false);
      expect(res2.status).toBe('UNSATISFIED');
      expect(res2.unfulfilledSummary).toBe('MA105 OR MA303 AND MA304');
    });

    it('matches compact requirement strings against spaced satisfied codes', () => {
      const req = '(MA101 AND MA105) OR MA303';
      const res = evaluateDNF(req, ['MA 101', 'MA 105']);
      expect(res.isSatisfied).toBe(true);
      expect(res.status).toBe('SATISFIED');
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
      expect(cs220Diag.missingSummary).toBe('Prerequisite: CS120');
      expect(cs220Diag.unfulfilledSummary).toBe('Prerequisite: CS120');
    });

    it('formats unfulfilledSummary and missingSummary with Glossary terms Prerequisite: and Corequisite:', () => {
      const catalog = [
        { code: 'ADV100', prerequisites: ['PREREQ1'], corequisites: ['COREQ1'] }
      ];
      const schedule = {
        transferCourses: [],
        years: [
          [[{ code: 'ADV100' }], [], []],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };
      const result = validateSchedule(schedule, catalog);
      const diag = result.diagnostics.find(d => d.courseCode === 'ADV100');
      expect(diag.overallStatus).toBe('UNSATISFIED');
      expect(diag.missingSummary).toBe('Prerequisite: PREREQ1; Corequisite: COREQ1');
      expect(diag.unfulfilledSummary).toBe('Prerequisite: PREREQ1; Corequisite: COREQ1');
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

    it('matches requirements when catalog prerequisites and schedule contain spaced course codes', () => {
      const catalog = [
        { code: 'CS 120', prerequisites: [] },
        { code: 'MATH 101', prerequisites: [] },
        { code: 'CS 220', prerequisites: '(CS 120 AND MATH 101)' }
      ];

      const schedule = {
        transferCourses: [{ code: 'MATH 101' }],
        years: [
          [
            [{ code: 'CS 120' }],
            [{ code: 'CS 220' }],
            []
          ],
          [[], [], []],
          [[], [], []],
          [[], [], []]
        ]
      };

      const result = validateSchedule(schedule, catalog);
      expect(result.summary.isValid).toBe(true);
      expect(result.summary.unsatisfiedCount).toBe(0);
      const cs220Diag = result.diagnostics.find(d => d.courseCode === 'CS 220');
      expect(cs220Diag.overallStatus).toBe('SATISFIED');
    });
  });

  describe('simulateScheduleMutation', () => {
    const catalog = [
      { code: 'CS120', prerequisites: [] },
      { code: 'CS220', prerequisites: ['CS120'] },
      { code: 'CS310', prerequisites: ['CS220'] },
      { code: 'ART110', prerequisites: [] }
    ];

    const baseSchedule = {
      transferCourses: [],
      years: [
        [
          [{ code: 'CS120' }],
          [{ code: 'CS220' }],
          [{ code: 'CS310' }]
        ],
        [
          [{ code: 'ART110' }],
          [],
          []
        ],
        [[], [], []],
        [[], [], []]
      ]
    };

    it('detects downstream impact when removing a required course', () => {
      const res = simulateScheduleMutation(baseSchedule, 'CS120', 'remove', null, catalog);
      expect(res.hasDownstreamImpact).toBe(true);
      expect(res.affectedCourses.length).toBeGreaterThanOrEqual(1);
      const affectedCodes = res.affectedCourses.map(c => c.courseCode);
      expect(affectedCodes).toContain('CS220');
      expect(res.affectedCourses[0].reason).toMatch(/CS120/i);
    });

    it('detects downstream impact when moving a prerequisite to a later term than its dependent', () => {
      // Move CS120 from Year 1 Term 1 to Year 1 Term 3 (after CS220)
      const res = simulateScheduleMutation(baseSchedule, 'CS120', 'move', [0, 2], catalog);
      expect(res.hasDownstreamImpact).toBe(true);
      const affectedCodes = res.affectedCourses.map(c => c.courseCode);
      expect(affectedCodes).toContain('CS220');
    });

    it('reports no downstream impact when moving to a safe earlier or same location', () => {
      // Move CS310 (which has no dependents in this schedule) to Year 2 Term 2
      const res = simulateScheduleMutation(baseSchedule, 'CS310', 'move', [1, 1], catalog);
      expect(res.hasDownstreamImpact).toBe(false);
      expect(res.affectedCourses).toEqual([]);
    });

    it('reports no downstream impact when removing an elective without dependents', () => {
      const res = simulateScheduleMutation(baseSchedule, 'ART110', 'remove', null, catalog);
      expect(res.hasDownstreamImpact).toBe(false);
      expect(res.affectedCourses).toEqual([]);
    });
  });
});
