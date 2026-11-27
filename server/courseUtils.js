/**
 * courseUtils.js
 * Utility functions for course code canonicalization and DNF requirement normalization.
 */

const VALID_CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/**
 * Canonicalizes a course code by trimming, uppercasing, and collapsing whitespace.
 * e.g. "  cs   120  " -> "CS120", "MA 101" -> "MA101", "MATH 101-B" -> "MATH101-B"
 * Also strips matching outer wrapping parentheses if any exist, e.g. "(CS 120)" -> "CS120".
 */
function canonicalizeCode(code) {
  if (typeof code !== 'string') return '';
  let str = code.trim().toUpperCase();
  while (str.startsWith('(') && str.endsWith(')')) {
    let depth = 0;
    let wrapsEntire = true;
    for (let i = 0; i < str.length - 1; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      if (depth === 0) {
        wrapsEntire = false;
        break;
      }
    }
    if (wrapsEntire) {
      str = str.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return str.replace(/\s+/g, '');
}

/**
 * Validates whether a given value represents a valid course code.
 */
function isValidCourseCode(code) {
  if (typeof code !== 'string') return false;
  const canonical = canonicalizeCode(code);
  if (!canonical || canonical === 'AND' || canonical === 'OR') return false;
  return VALID_CODE_PATTERN.test(canonical);
}

/**
 * Merges two DNF arrays via distributive expansion of conjunction (AND) over disjunction (OR).
 * e.g. [[A], [B]] AND [[C]] -> [[A, C], [B, C]]
 */
function distributeAnd(dnf1, dnf2) {
  if (!dnf1 || dnf1.length === 0) return dnf2 || [];
  if (!dnf2 || dnf2.length === 0) return dnf1 || [];
  const result = [];
  for (const clause1 of dnf1) {
    for (const clause2 of dnf2) {
      const merged = [];
      const seen = new Set();
      for (const code of [...clause1, ...clause2]) {
        if (!seen.has(code)) {
          seen.add(code);
          merged.push(code);
        }
      }
      result.push(merged);
    }
  }
  return result;
}

/**
 * Merges two DNF arrays via disjunction (OR).
 * e.g. [[A]] OR [[B]] -> [[A], [B]]
 */
function distributeOr(dnf1, dnf2) {
  if (!dnf1 || dnf1.length === 0) return dnf2 || [];
  if (!dnf2 || dnf2.length === 0) return dnf1 || [];
  return [...dnf1, ...dnf2];
}

/**
 * Tokenizes a validated boolean requirement string into a token array.
 */
function tokenizeRequirementString(str) {
  const tokens = [];
  let i = 0;
  const n = str.length;

  while (i < n) {
    while (i < n && /\s/.test(str[i])) {
      i++;
    }
    if (i >= n) break;

    const ch = str[i];
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === '|' || (str.slice(i, i + 2).toUpperCase() === 'OR' && (i + 2 === n || /[\s(),|&]/.test(str[i + 2])))) {
      tokens.push({ type: 'OR', value: 'OR' });
      i += (ch === '|' ? 1 : 2);
      continue;
    }
    if (ch === '&' || ch === ',' || (str.slice(i, i + 3).toUpperCase() === 'AND' && (i + 3 === n || /[\s(),|&]/.test(str[i + 3])))) {
      tokens.push({ type: 'AND', value: 'AND' });
      i += (ch === '&' || ch === ',' ? 1 : 3);
      continue;
    }

    let start = i;
    while (i < n) {
      const c = str[i];
      if (c === '(' || c === ')' || c === '|' || c === '&' || c === ',') {
        break;
      }
      if (str.slice(i, i + 2).toUpperCase() === 'OR' && (i === 0 || /\s/.test(str[i - 1])) && (i + 2 === n || /[\s(),|&]/.test(str[i + 2]))) {
        break;
      }
      if (str.slice(i, i + 3).toUpperCase() === 'AND' && (i === 0 || /\s/.test(str[i - 1])) && (i + 3 === n || /[\s(),|&]/.test(str[i + 3]))) {
        break;
      }
      i++;
    }

    const raw = str.slice(start, i).trim();
    if (!raw) {
      throw new Error('Invalid requirement syntax: empty token in expression');
    }

    const canonical = canonicalizeCode(raw);
    if (!canonical || canonical === 'AND' || canonical === 'OR' || !VALID_CODE_PATTERN.test(canonical)) {
      throw new Error(`Invalid requirement syntax: invalid course code "${raw}" in requirement`);
    }

    tokens.push({ type: 'CODE', value: canonical, raw });
  }

  return tokens;
}

/**
 * Parses tokens into Disjunctive Normal Form (DNF) using recursive descent with
 * conjunction-over-disjunction distributive expansion.
 * 
 * Grammar:
 * Expr    -> OrExpr
 * OrExpr  -> AndExpr ( 'OR' AndExpr )*
 * AndExpr -> Primary ( 'AND' Primary )*
 * Primary -> '(' Expr ')' | CODE
 */
function parseTokensToDnf(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos] || null;
  }

  function consume(expectedType) {
    const token = tokens[pos];
    if (!token) {
      throw new Error('Invalid requirement syntax: unexpected end of expression');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Invalid requirement syntax: unexpected token "${token.value || token.raw}"`);
    }
    pos++;
    return token;
  }

  function parseExpr() {
    return parseOrExpr();
  }

  function parseOrExpr() {
    let result = parseAndExpr();
    while (peek() && peek().type === 'OR') {
      consume('OR');
      const next = parseAndExpr();
      result = distributeOr(result, next);
    }
    return result;
  }

  function parseAndExpr() {
    let result = parsePrimary();
    while (peek() && peek().type === 'AND') {
      consume('AND');
      const next = parsePrimary();
      result = distributeAnd(result, next);
    }
    return result;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) {
      throw new Error('Invalid requirement syntax: dangling boolean operator');
    }
    if (token.type === 'LPAREN') {
      consume('LPAREN');
      const expr = parseExpr();
      if (!peek() || peek().type !== 'RPAREN') {
        throw new Error('Invalid requirement syntax: unbalanced parentheses');
      }
      consume('RPAREN');
      return expr;
    }
    if (token.type === 'CODE') {
      consume('CODE');
      return [[token.value]];
    }
    if (token.type === 'OR' || token.type === 'AND') {
      throw new Error(`Invalid requirement syntax: misplaced boolean operator "${token.value}"`);
    }
    throw new Error(`Invalid requirement syntax: unexpected token "${token.value || token.raw}"`);
  }

  const dnf = parseExpr();
  if (pos < tokens.length) {
    const extra = tokens[pos];
    if (extra.type === 'RPAREN') {
      throw new Error('Invalid requirement syntax: unbalanced parentheses');
    }
    throw new Error(`Invalid requirement syntax: unexpected token "${extra.value || extra.raw}"`);
  }
  return dnf;
}

/**
 * Normalizes any requirement representation (DNF array, flat array, or boolean string)
 * into canonical Disjunctive Normal Form (DNF): Array<Array<string>>.
 * 
 * Validates balanced and well-formed parentheses BEFORE token extraction.
 * Distributes conjunctions over disjunctions (e.g. (A OR B) AND C -> [[A, C], [B, C]]).
 */
function normalizeRequirements(req) {
  if (req === undefined || req === null) {
    return [];
  }

  if (typeof req === 'string') {
    let trimmed = req.trim();
    if (!trimmed) return [];

    // Check for empty parentheses ()
    if (/\(\s*\)/.test(trimmed)) {
      throw new Error('Invalid requirement syntax: empty parentheses');
    }

    // Check for balanced parentheses BEFORE token extraction
    let balance = 0;
    for (const ch of trimmed) {
      if (ch === '(') balance++;
      else if (ch === ')') {
        balance--;
        if (balance < 0) {
          throw new Error('Invalid requirement syntax: unbalanced parentheses');
        }
      }
    }
    if (balance !== 0) {
      throw new Error('Invalid requirement syntax: unbalanced parentheses');
    }

    // Check for unsupported characters
    if (/[^a-zA-Z0-9\s(),\-&|]/.test(trimmed)) {
      throw new Error('Invalid requirement syntax: unsupported characters in expression');
    }

    // Check for leading boolean operators
    if (/^(\b(OR|AND)\b|[|&,])/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: leading boolean operator');
    }

    // Check for dangling/trailing boolean operators
    if (/(\b(OR|AND)\b|[|&,])$/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: dangling boolean operator');
    }

    // Check for consecutive boolean operators
    if (/(\b(OR|AND)\b|[|&,])\s*(\b(OR|AND)\b|[|&,])/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: consecutive boolean operators');
    }

    // Check for misplaced boolean operators directly adjacent to parentheses
    if (/\(\s*(\b(OR|AND)\b|[|&,])/i.test(trimmed) || /(\b(OR|AND)\b|[|&,])\s*\)/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: misplaced boolean operator next to parenthesis');
    }

    const tokens = tokenizeRequirementString(trimmed);
    return parseTokensToDnf(tokens);
  }

  if (Array.isArray(req)) {
    if (req.length === 0) return [];

    // Check if 2D array (DNF)
    if (Array.isArray(req[0])) {
      if (!req.every(clause => Array.isArray(clause))) {
        throw new Error('Invalid requirement syntax: mixed array structures not allowed');
      }
      if (req.some(clause => clause.length === 0)) {
        throw new Error('Invalid requirement syntax: empty clause in DNF array');
      }

      return req.map(clause => {
        return clause.map(item => {
          if (typeof item !== 'string') {
            throw new Error(`Invalid requirement syntax: non-string course code in array: ${JSON.stringify(item)}`);
          }
          const canonical = canonicalizeCode(item);
          if (!canonical || canonical === 'AND' || canonical === 'OR' || !VALID_CODE_PATTERN.test(canonical)) {
            throw new Error(`Invalid requirement syntax: invalid course code "${item}" in array`);
          }
          return canonical;
        });
      });
    }

    // Flat array of strings
    return [
      req.map(item => {
        if (typeof item !== 'string') {
          throw new Error(`Invalid requirement syntax: non-string course code in flat array: ${JSON.stringify(item)}`);
        }
        const canonical = canonicalizeCode(item);
        if (!canonical || canonical === 'AND' || canonical === 'OR' || !VALID_CODE_PATTERN.test(canonical)) {
          throw new Error(`Invalid requirement syntax: invalid course code "${item}" in flat array`);
        }
        return canonical;
      })
    ];
  }

  throw new Error('Invalid requirement syntax: requirements must be a string expression or array of course codes');
}

/**
 * Extracts all unique canonical course codes from a requirement specification
 * (DNF array, flat array, or boolean string).
 */
function extractCourseCodes(req) {
  if (!req) return [];
  let dnf = req;
  if (typeof dnf === 'string') {
    try {
      dnf = normalizeRequirements(dnf);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(dnf)) return [];

  const codes = new Set();
  for (const clause of dnf) {
    if (Array.isArray(clause)) {
      for (const item of clause) {
        if (typeof item === 'string') {
          const canonical = canonicalizeCode(item);
          if (canonical && isValidCourseCode(canonical)) {
            codes.add(canonical);
          }
        }
      }
    } else if (typeof clause === 'string') {
      const canonical = canonicalizeCode(clause);
      if (canonical && isValidCourseCode(canonical)) {
        codes.add(canonical);
      }
    }
  }
  return Array.from(codes);
}

/**
 * Detects whether adding/updating targetCode with proposedPrerequisites introduces
 * a directed cycle in the prerequisite graph, or whether an existing set of catalog
 * courses contains any prerequisite cycles.
 * 
 * Returns the cycle path (e.g. ['A', 'B', 'A']) if a cycle is found, or null otherwise.
 */
function detectPrerequisiteCycle(targetCode, proposedPrerequisites, catalogCourses = []) {
  const graph = new Map();

  function getPrerequisites(course) {
    if (!course) return [];
    const prerequisites = course.prerequisites !== undefined ? course.prerequisites : [];
    return extractCourseCodes(prerequisites);
  }

  // Populate graph from catalog courses
  for (const course of catalogCourses) {
    if (!course || !course.code) continue;
    const code = canonicalizeCode(course.code);
    const prerequisites = getPrerequisites(course);
    graph.set(code, new Set(prerequisites));
  }

  // Add/override target course if provided
  if (targetCode) {
    const canonicalTarget = canonicalizeCode(targetCode);
    const targetPrerequisites = proposedPrerequisites ? extractCourseCodes(proposedPrerequisites) : [];
    graph.set(canonicalTarget, new Set(targetPrerequisites));
  }

  // DFS Cycle detection with 3-color states: 0 = unvisited, 1 = visiting, 2 = visited
  const state = new Map();

  function dfs(node, path) {
    state.set(node, 1);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor) || 0;
      if (neighborState === 1) {
        // Cycle detected: isolate the cycle slice from path
        const cycleStartIndex = path.indexOf(neighbor);
        return path.slice(cycleStartIndex).concat(neighbor);
      }
      if (neighborState === 0) {
        const cycle = dfs(neighbor, path);
        if (cycle) return cycle;
      }
    }

    path.pop();
    state.set(node, 2);
    return null;
  }

  // If targetCode was given, run DFS from targetCode first
  if (targetCode) {
    const canonicalTarget = canonicalizeCode(targetCode);
    if (graph.has(canonicalTarget)) {
      const cycle = dfs(canonicalTarget, []);
      if (cycle) return cycle;
    }
  }

  // Check all remaining nodes in graph
  for (const node of graph.keys()) {
    if ((state.get(node) || 0) === 0) {
      const cycle = dfs(node, []);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Validates course requirements for referential integrity, self-references,
 * and prerequisite cycles. Throws an Error with a descriptive message if invalid.
 */
function validateCourseRequirements({
  code,
  prerequisites,
  corequisites,
  existingCourses = [],
  batchCodes = new Set(),
  skipCycleDetection = false
}) {
  const canonical = canonicalizeCode(code);
  if (canonical && !isValidCourseCode(canonical)) {
    throw new Error(`Invalid course code: ${canonical}`);
  }
  const prerequisiteCodes = extractCourseCodes(prerequisites);
  const corequisiteCodes = extractCourseCodes(corequisites);

  // 1. Self-reference check
  if (canonical) {
    if (prerequisiteCodes.includes(canonical)) {
      throw new Error(`Course cannot require itself as a prerequisite: ${canonical}`);
    }
    if (corequisiteCodes.includes(canonical)) {
      throw new Error(`Course cannot corequisite itself: ${canonical}`);
    }
  }

  // 2. Referential integrity check
  const knownCodes = new Set();
  for (const existingCourse of existingCourses) {
    if (existingCourse && existingCourse.code) {
      knownCodes.add(canonicalizeCode(existingCourse.code));
    }
  }
  for (const batchCode of batchCodes) {
    knownCodes.add(canonicalizeCode(batchCode));
  }

  for (const prerequisiteCode of prerequisiteCodes) {
    if (!knownCodes.has(prerequisiteCode)) {
      throw new Error(`Referenced prerequisite course "${prerequisiteCode}" does not exist in the catalog`);
    }
  }

  for (const corequisiteCode of corequisiteCodes) {
    if (!knownCodes.has(corequisiteCode)) {
      throw new Error(`Referenced corequisite course "${corequisiteCode}" does not exist in the catalog`);
    }
  }

  // 3. Prerequisite cycle detection
  if (!skipCycleDetection) {
    const cycle = detectPrerequisiteCycle(canonical, prerequisites, existingCourses);
    if (cycle) {
      throw new Error(`Prerequisite cycle detected: ${cycle.join(' -> ')}`);
    }
  }
}

/**
 * Validates an entire batch of courses (e.g. for bulkCreate or database seeding).
 * Batch-aware: courses defined later in the batch can satisfy requirements of earlier courses.
 * Deduplicated: delegates course validation to validateCourseRequirements.
 */
function validateCourseBatch(courses, existingCourses = []) {
  if (!Array.isArray(courses) || courses.length === 0) return;

  const batchCodes = new Set();
  for (const course of courses) {
    if (!course || !course.code) continue;
    const canonical = canonicalizeCode(course.code);
    if (batchCodes.has(canonical)) {
      throw new Error(`Duplicate course code in batch: ${canonical}`);
    }
    batchCodes.add(canonical);
  }

  // Delegate course requirement validation to validateCourseRequirements
  for (const course of courses) {
    validateCourseRequirements({
      code: course.code,
      prerequisites: course.prerequisites,
      corequisites: course.corequisites,
      existingCourses,
      batchCodes,
      skipCycleDetection: true
    });
  }

  // Combined cycle detection on existing + batch courses
  const combined = [...existingCourses, ...courses];
  const cycle = detectPrerequisiteCycle(null, null, combined);
  if (cycle) {
    throw new Error(`Prerequisite cycle detected: ${cycle.join(' -> ')}`);
  }
}

/**
 * Finds all courses in catalogCourses that directly depend on the given course code
 * as a prerequisite or corequisite.
 * 
 * Returns an array of dependent course descriptor objects:
 * [{ id, code, name, type: 'prerequisite' | 'corequisite' | 'both', isPrerequisite: boolean, isCorequisite: boolean }]
 */
function findDependentCourses(code, catalogCourses = []) {
  if (!code || typeof code !== 'string') return [];
  const target = canonicalizeCode(code);
  if (!target || !Array.isArray(catalogCourses) || catalogCourses.length === 0) return [];

  const dependents = [];

  for (const course of catalogCourses) {
    if (!course || !course.code) continue;
    const courseCode = canonicalizeCode(course.code);
    if (courseCode === target) continue; // Self-reference is not a valid dependent

    const prerequisiteCodes = extractCourseCodes(course.prerequisites);
    const corequisiteCodes = extractCourseCodes(course.corequisites);

    const isPrerequisite = prerequisiteCodes.includes(target);
    const isCorequisite = corequisiteCodes.includes(target);

    if (isPrerequisite || isCorequisite) {
      let type = 'prerequisite';
      if (isPrerequisite && isCorequisite) {
        type = 'both';
      } else if (isCorequisite) {
        type = 'corequisite';
      }

      dependents.push({
        id: course.id,
        code: courseCode,
        name: course.name,
        type,
        isPrerequisite,
        isCorequisite
      });
    }
  }

  return dependents;
}

module.exports = {
  canonicalizeCode,
  isValidCourseCode,
  normalizeRequirements,
  extractCourseCodes,
  detectPrerequisiteCycle,
  validateCourseRequirements,
  validateCourseBatch,
  findDependentCourses
};
