const {
  canonicalizeCode,
  isValidCourseCode,
  normalizeRequirements
} = require('../courseUtils');

describe('Course Utilities Unit Tests', () => {
  describe('canonicalizeCode', () => {
    test('canonicalizes course codes by trimming, uppercasing, and stripping whitespace', () => {
      expect(canonicalizeCode('MA 101')).toBe('MA101');
      expect(canonicalizeCode('cs 120')).toBe('CS120');
      expect(canonicalizeCode('  cs   120  ')).toBe('CS120');
      expect(canonicalizeCode('MATH 101-B')).toBe('MATH101-B');
      expect(canonicalizeCode('(CS 120)')).toBe('CS120');
      expect(canonicalizeCode('AP-CALC')).toBe('AP-CALC');
    });

    test('returns empty string for non-string or falsy input', () => {
      expect(canonicalizeCode('')).toBe('');
      expect(canonicalizeCode(null)).toBe('');
      expect(canonicalizeCode(undefined)).toBe('');
      expect(canonicalizeCode(123)).toBe('');
      expect(canonicalizeCode({})).toBe('');
    });
  });

  describe('isValidCourseCode', () => {
    test('returns true for valid alphanumeric and hyphenated codes', () => {
      expect(isValidCourseCode('CS120')).toBe(true);
      expect(isValidCourseCode('cs 120')).toBe(true);
      expect(isValidCourseCode('MATH 101-B')).toBe(true);
      expect(isValidCourseCode('AP-CALC')).toBe(true);
      expect(isValidCourseCode('BIO105')).toBe(true);
    });

    test('returns false for invalid codes, symbols, keywords, or non-strings', () => {
      expect(isValidCourseCode('')).toBe(false);
      expect(isValidCourseCode('   ')).toBe(false);
      expect(isValidCourseCode('AND')).toBe(false);
      expect(isValidCourseCode('OR')).toBe(false);
      expect(isValidCourseCode('CS@100')).toBe(false);
      expect(isValidCourseCode('CS#120')).toBe(false);
      expect(isValidCourseCode(null)).toBe(false);
      expect(isValidCourseCode(undefined)).toBe(false);
      expect(isValidCourseCode(123)).toBe(false);
      expect(isValidCourseCode(['CS120'])).toBe(false);
    });
  });

  describe('normalizeRequirements', () => {
    test('normalizes empty, null, or undefined values to empty array', () => {
      expect(normalizeRequirements(null)).toEqual([]);
      expect(normalizeRequirements(undefined)).toEqual([]);
      expect(normalizeRequirements('')).toEqual([]);
      expect(normalizeRequirements('   ')).toEqual([]);
      expect(normalizeRequirements([])).toEqual([]);
    });

    test('normalizes flat array of course codes into a single AND clause', () => {
      expect(normalizeRequirements(['cs 120', 'math 101'])).toEqual([['CS120', 'MATH101']]);
      expect(normalizeRequirements(['CS120'])).toEqual([['CS120']]);
    });

    test('normalizes 2D DNF array and canonicalizes codes', () => {
      expect(normalizeRequirements([['cs 120', 'math 101'], ['cs 220']])).toEqual([
        ['CS120', 'MATH101'],
        ['CS220']
      ]);
    });

    test('normalizes boolean string expressions with AND and OR', () => {
      expect(normalizeRequirements('(CS 120 AND MATH 101) OR CS 220')).toEqual([
        ['CS120', 'MATH101'],
        ['CS220']
      ]);
      expect(normalizeRequirements('(MA101 AND MA105) OR (MA303 AND MA304)')).toEqual([
        ['MA101', 'MA105'],
        ['MA303', 'MA304']
      ]);
    });

    test('normalizes string expressions with comma, pipe, and ampersand operators', () => {
      expect(normalizeRequirements('CS120, MATH101')).toEqual([['CS120', 'MATH101']]);
      expect(normalizeRequirements('CS120 & MATH101 | CS220')).toEqual([
        ['CS120', 'MATH101'],
        ['CS220']
      ]);
      expect(normalizeRequirements('CS120 | MATH101')).toEqual([
        ['CS120'],
        ['MATH101']
      ]);
    });

    test('handles expressions completely wrapped in outer parentheses', () => {
      expect(normalizeRequirements('((CS 120 AND MATH 101) OR CS 220)')).toEqual([
        ['CS120', 'MATH101'],
        ['CS220']
      ]);
      expect(normalizeRequirements('(CS120 | MATH101)')).toEqual([
        ['CS120'],
        ['MATH101']
      ]);
    });

    test('throws error on unbalanced parentheses', () => {
      expect(() => normalizeRequirements('(CS120 AND MATH101')).toThrow(/unbalanced parentheses/i);
      expect(() => normalizeRequirements('CS120 AND MATH101)')).toThrow(/unbalanced parentheses/i);
      expect(() => normalizeRequirements(')CS120(')).toThrow(/unbalanced parentheses/i);
    });

    test('throws error on empty parentheses', () => {
      expect(() => normalizeRequirements('()')).toThrow(/empty parentheses/i);
      expect(() => normalizeRequirements('CS120 AND ( )')).toThrow(/empty parentheses/i);
    });

    test('throws error on unsupported characters', () => {
      expect(() => normalizeRequirements('CS120 @#$ MATH101')).toThrow(/unsupported characters/i);
      expect(() => normalizeRequirements('CS120 ! MATH101')).toThrow(/unsupported characters/i);
    });

    test('throws error on leading or dangling boolean operators', () => {
      expect(() => normalizeRequirements('AND CS120')).toThrow(/leading boolean operator/i);
      expect(() => normalizeRequirements('OR CS120')).toThrow(/leading boolean operator/i);
      expect(() => normalizeRequirements('| CS120')).toThrow(/leading boolean operator/i);
      expect(() => normalizeRequirements('& CS120')).toThrow(/leading boolean operator/i);
      expect(() => normalizeRequirements(', CS120')).toThrow(/leading boolean operator/i);

      expect(() => normalizeRequirements('CS120 AND')).toThrow(/dangling boolean operator/i);
      expect(() => normalizeRequirements('CS120 OR')).toThrow(/dangling boolean operator/i);
      expect(() => normalizeRequirements('CS120 |')).toThrow(/dangling boolean operator/i);
      expect(() => normalizeRequirements('CS120 &')).toThrow(/dangling boolean operator/i);
      expect(() => normalizeRequirements('CS120,')).toThrow(/dangling boolean operator/i);
    });

    test('throws error on consecutive boolean operators', () => {
      expect(() => normalizeRequirements('CS120 OR OR CS220')).toThrow(/consecutive boolean operators/i);
      expect(() => normalizeRequirements('CS120 AND AND CS220')).toThrow(/consecutive boolean operators/i);
      expect(() => normalizeRequirements('CS120 OR AND CS220')).toThrow(/consecutive boolean operators/i);
      expect(() => normalizeRequirements('CS120 | | CS220')).toThrow(/consecutive boolean operators/i);
      expect(() => normalizeRequirements('CS120 & & CS220')).toThrow(/consecutive boolean operators/i);
      expect(() => normalizeRequirements('CS120 , , CS220')).toThrow(/consecutive boolean operators/i);
    });

    test('throws error on misplaced boolean operators next to parentheses', () => {
      expect(() => normalizeRequirements('(OR CS120)')).toThrow(/misplaced boolean operator/i);
      expect(() => normalizeRequirements('(CS120 OR)')).toThrow(/misplaced boolean operator/i);
    });

    test('throws error on invalid array structures', () => {
      expect(() => normalizeRequirements([[['CS120']]])).toThrow(/non-string course code/i);
      expect(() => normalizeRequirements([123])).toThrow(/non-string course code/i);
      expect(() => normalizeRequirements([[123]])).toThrow(/non-string course code/i);
      expect(() => normalizeRequirements([''])).toThrow(/invalid course code/i);
      expect(() => normalizeRequirements([['']])).toThrow(/invalid course code/i);
      expect(() => normalizeRequirements([['CS120'], []])).toThrow(/empty clause/i);
      expect(() => normalizeRequirements([['CS120'], 'CS220'])).toThrow(/mixed array structures/i);
    });

    test('throws error on non-string non-array types', () => {
      expect(() => normalizeRequirements(123)).toThrow(/must be a string expression or array/i);
      expect(() => normalizeRequirements({ req: 'CS120' })).toThrow(/must be a string expression or array/i);
      expect(() => normalizeRequirements(true)).toThrow(/must be a string expression or array/i);
    });
  });
});
