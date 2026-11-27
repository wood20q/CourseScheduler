const {
  canonicalizeCode,
  isValidCourseCode,
  normalizeRequirements,
  extractCourseCodes,
  detectPrerequisiteCycle,
  findDependentCourses
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
      expect(isValidCourseCode('(CS120')).toBe(false);
      expect(isValidCourseCode('CS120)')).toBe(false);
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

    test('distributes conjunctions over disjunctions into canonical DNF', () => {
      // (A OR B) AND C -> (A AND C) OR (B AND C) -> [['A', 'C'], ['B', 'C']]
      expect(normalizeRequirements('(CS120 OR CS220) AND MATH101')).toEqual([
        ['CS120', 'MATH101'],
        ['CS220', 'MATH101']
      ]);

      // C AND (A OR B) -> [['MATH101', 'CS120'], ['MATH101', 'CS220']]
      expect(normalizeRequirements('MATH101 AND (CS120 OR CS220)')).toEqual([
        ['MATH101', 'CS120'],
        ['MATH101', 'CS220']
      ]);

      // (A OR B) AND (C OR D) -> 4 clauses
      expect(normalizeRequirements('(CS120 OR CS220) AND (MATH101 OR MATH215)')).toEqual([
        ['CS120', 'MATH101'],
        ['CS120', 'MATH215'],
        ['CS220', 'MATH101'],
        ['CS220', 'MATH215']
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
      expect(() => normalizeRequirements('(CS120')).toThrow(/unbalanced parentheses/i);
      expect(() => normalizeRequirements('CS120)')).toThrow(/unbalanced parentheses/i);
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
      expect(() => normalizeRequirements(['(CS120'])).toThrow(/invalid course code/i);
      expect(() => normalizeRequirements([['(CS120']])).toThrow(/invalid course code/i);
      expect(() => normalizeRequirements([['CS120'], []])).toThrow(/empty clause/i);
      expect(() => normalizeRequirements([['CS120'], 'CS220'])).toThrow(/mixed array structures/i);
    });

    test('throws error on non-string non-array types', () => {
      expect(() => normalizeRequirements(123)).toThrow(/must be a string expression or array/i);
      expect(() => normalizeRequirements({ req: 'CS120' })).toThrow(/must be a string expression or array/i);
      expect(() => normalizeRequirements(true)).toThrow(/must be a string expression or array/i);
    });
  });

  describe('extractCourseCodes', () => {
    test('extracts unique canonical course codes from DNF arrays', () => {
      expect(extractCourseCodes([['CS120', 'MATH101'], ['CS220']])).toEqual(['CS120', 'MATH101', 'CS220']);
      expect(extractCourseCodes([['CS120'], ['CS120']])).toEqual(['CS120']);
      expect(extractCourseCodes([['cs 120', '  math   101 ']])).toEqual(['CS120', 'MATH101']);
    });

    test('extracts codes from string expressions', () => {
      expect(extractCourseCodes('(CS120 AND MATH101) OR CS220')).toEqual(['CS120', 'MATH101', 'CS220']);
      expect(extractCourseCodes('CS120, MATH101')).toEqual(['CS120', 'MATH101']);
      expect(extractCourseCodes('')).toEqual([]);
    });

    test('returns empty array for falsy, empty, or invalid input', () => {
      expect(extractCourseCodes([])).toEqual([]);
      expect(extractCourseCodes(null)).toEqual([]);
      expect(extractCourseCodes(undefined)).toEqual([]);
      expect(extractCourseCodes(123)).toEqual([]);
    });
  });

  describe('detectPrerequisiteCycle', () => {
    test('returns null when no cycle exists (simple linear chain)', () => {
      const catalog = [
        { code: 'CS120', prerequisites: [] },
        { code: 'CS220', prerequisites: [['CS120']] },
        { code: 'CS310', prerequisites: [['CS220']] }
      ];
      expect(detectPrerequisiteCycle('CS400', [['CS310']], catalog)).toBeNull();
    });

    test('returns null for diamond graphs (DAG with multiple paths to same root)', () => {
      // A -> B -> D, A -> C -> D
      const catalog = [
        { code: 'D', prerequisites: [] },
        { code: 'B', prerequisites: [['D']] },
        { code: 'C', prerequisites: [['D']] }
      ];
      expect(detectPrerequisiteCycle('A', [['B', 'C']], catalog)).toBeNull();
    });

    test('detects self-loop (length 1)', () => {
      const cycle = detectPrerequisiteCycle('CS100', [['CS100']], []);
      expect(cycle).toEqual(['CS100', 'CS100']);
    });

    test('detects direct 2-node cycle (A -> B -> A)', () => {
      const catalog = [
        { code: 'A', prerequisites: [['B']] }
      ];
      const cycle = detectPrerequisiteCycle('B', [['A']], catalog);
      expect(cycle).toEqual(['B', 'A', 'B']);
    });

    test('detects multi-hop 3-node cycle (A -> B -> C -> A)', () => {
      const catalog = [
        { code: 'A', prerequisites: [['B']] },
        { code: 'B', prerequisites: [['C']] }
      ];
      const cycle = detectPrerequisiteCycle('C', [['A']], catalog);
      expect(cycle).toEqual(['C', 'A', 'B', 'C']);
    });

    test('detects cycle in batch across multiple nodes', () => {
      const allNodes = [
        { code: 'X', prerequisites: [['Y']] },
        { code: 'Y', prerequisites: [['Z']] },
        { code: 'Z', prerequisites: [['X']] }
      ];
      const cycle = detectPrerequisiteCycle(null, null, allNodes);
      expect(cycle).toBeDefined();
      expect(cycle[0]).toBe(cycle[cycle.length - 1]);
    });
  });

  describe('findDependentCourses', () => {
    const sampleCatalog = [
      { id: 1, code: 'CS120', name: 'Intro to Python', prerequisites: [], corequisites: [] },
      { id: 2, code: 'CS220', name: 'Data Structures', prerequisites: [['CS120']], corequisites: [] },
      { id: 3, code: 'MATH101', name: 'Calculus I', prerequisites: [], corequisites: [] },
      { id: 4, code: 'PHYS200', name: 'General Physics', prerequisites: [], corequisites: [['MATH101']] },
      { id: 5, code: 'CS240', name: 'Cybersecurity', prerequisites: 'CS120', corequisites: [] },
      { id: 6, code: 'CS350', name: 'Software Engineering', prerequisites: [['CS220', 'CS240']], corequisites: [] },
      { id: 7, code: 'ENG200', name: 'Creative Writing', prerequisites: [], corequisites: [] }
    ];

    test('returns empty array when course has no dependents', () => {
      const dependents = findDependentCourses('ENG200', sampleCatalog);
      expect(dependents).toEqual([]);
    });

    test('finds downstream prerequisite dependents', () => {
      const dependents = findDependentCourses('CS120', sampleCatalog);
      expect(dependents).toHaveLength(2);
      const codes = dependents.map(d => d.code);
      expect(codes).toContain('CS220');
      expect(codes).toContain('CS240');
      expect(dependents.every(d => d.isPrerequisite)).toBe(true);
      expect(dependents.find(d => d.code === 'CS220').type).toBe('prerequisite');
    });

    test('finds downstream corequisite dependents', () => {
      const dependents = findDependentCourses('MATH101', sampleCatalog);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].code).toBe('PHYS200');
      expect(dependents[0].type).toBe('corequisite');
      expect(dependents[0].isCorequisite).toBe(true);
    });

    test('identifies dependents requiring target as both prerequisite and corequisite', () => {
      const catalogWithBoth = [
        { id: 10, code: 'LAB101', name: 'Physics Lab', prerequisites: [['PHYS100']], corequisites: [['PHYS100']] }
      ];
      const dependents = findDependentCourses('PHYS100', catalogWithBoth);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].code).toBe('LAB101');
      expect(dependents[0].type).toBe('both');
      expect(dependents[0].isPrerequisite).toBe(true);
      expect(dependents[0].isCorequisite).toBe(true);
    });

    test('canonicalizes course codes (whitespace and casing)', () => {
      const dependents = findDependentCourses('  cs  120 ', sampleCatalog);
      expect(dependents).toHaveLength(2);
      expect(dependents.map(d => d.code)).toEqual(expect.arrayContaining(['CS220', 'CS240']));
    });

    test('ignores self-referencing if present in corrupt catalog data', () => {
      const corruptCatalog = [
        { id: 99, code: 'CORRUPT', name: 'Corrupt Course', prerequisites: [['CORRUPT']] }
      ];
      const dependents = findDependentCourses('CORRUPT', corruptCatalog);
      expect(dependents).toEqual([]);
    });

    test('returns empty array for empty catalog, null, or undefined code', () => {
      expect(findDependentCourses(null, sampleCatalog)).toEqual([]);
      expect(findDependentCourses(undefined, sampleCatalog)).toEqual([]);
      expect(findDependentCourses('', sampleCatalog)).toEqual([]);
      expect(findDependentCourses('CS120', [])).toEqual([]);
      expect(findDependentCourses('CS120', null)).toEqual([]);
    });
  });
});
