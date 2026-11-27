/**
 * courseUtils.js
 * Utility functions for course code canonicalization and DNF requirement normalization.
 */

const VALID_CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/**
 * Canonicalizes a course code by trimming, uppercasing, and collapsing whitespace.
 * e.g. "  cs   120  " -> "CS120", "MA 101" -> "MA101", "MATH 101-B" -> "MATH101-B"
 * Also strips surrounding parentheses if any exist.
 */
function canonicalizeCode(code) {
  if (typeof code !== 'string') return '';
  return code.replace(/[()]/g, '').trim().toUpperCase().replace(/\s+/g, '');
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
 * Normalizes any requirement representation (DNF array, flat array, or boolean string)
 * into canonical Disjunctive Normal Form (DNF): Array<Array<string>>.
 * 
 * Examples:
 * - [["cs 120", "math 101"], ["cs 220"]] -> [["CS120", "MATH101"], ["CS220"]]
 * - ["cs 120", "math 101"] -> [["CS120", "MATH101"]]
 * - "(CS 120 AND MATH 101) OR CS 220" -> [["CS120", "MATH101"], ["CS220"]]
 * - "CS120, MATH101" -> [["CS120", "MATH101"]]
 * - "CS120 & MATH101 | CS220" -> [["CS120", "MATH101"], ["CS220"]]
 * - null / undefined / "" / [] -> []
 * 
 * Throws an Error with descriptive message if the requirement syntax or structure is invalid.
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

    // Check for balanced parentheses
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

    // Strip outer matching parentheses wrapping the entire expression
    while (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      let innerBalance = 0;
      let isWrapped = true;
      for (let i = 0; i < trimmed.length - 1; i++) {
        if (trimmed[i] === '(') innerBalance++;
        else if (trimmed[i] === ')') innerBalance--;
        if (innerBalance === 0) {
          isWrapped = false;
          break;
        }
      }
      if (isWrapped) {
        trimmed = trimmed.slice(1, -1).trim();
      } else {
        break;
      }
    }

    // Re-verify after unwrap in case inner expression had leading/trailing operators
    if (/^(\b(OR|AND)\b|[|&,])/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: leading boolean operator');
    }
    if (/(\b(OR|AND)\b|[|&,])$/i.test(trimmed)) {
      throw new Error('Invalid requirement syntax: dangling boolean operator');
    }

    // Split into OR clauses
    const orParts = trimmed.split(/\s*\bOR\b\s*|\s*\|\s*/i);
    if (orParts.some(p => p.trim() === '')) {
      throw new Error('Invalid requirement syntax: empty OR clause or dangling boolean operator');
    }

    const dnf = [];
    for (const part of orParts) {
      let clauseStr = part.trim();

      // Strip outer matching parentheses if they wrap this entire clause
      while (clauseStr.startsWith('(') && clauseStr.endsWith(')')) {
        let innerBalance = 0;
        let isWrapped = true;
        for (let i = 0; i < clauseStr.length - 1; i++) {
          if (clauseStr[i] === '(') innerBalance++;
          else if (clauseStr[i] === ')') innerBalance--;
          if (innerBalance === 0) {
            isWrapped = false;
            break;
          }
        }
        if (isWrapped) {
          clauseStr = clauseStr.slice(1, -1).trim();
        } else {
          break;
        }
      }

      // Re-verify clause after unwrap
      if (/^(\b(OR|AND)\b|[|&,])/i.test(clauseStr)) {
        throw new Error('Invalid requirement syntax: leading boolean operator in clause');
      }
      if (/(\b(OR|AND)\b|[|&,])$/i.test(clauseStr)) {
        throw new Error('Invalid requirement syntax: dangling boolean operator in clause');
      }

      // Split clause by AND operators: "AND", "&", or ","
      const andParts = clauseStr.split(/\s*\bAND\b\s*|\s*&\s*|\s*,\s*/i);
      if (andParts.some(p => p.trim() === '')) {
        throw new Error('Invalid requirement syntax: empty AND item or dangling boolean operator');
      }

      const andClause = [];
      for (const item of andParts) {
        const canonical = canonicalizeCode(item);
        if (!canonical || canonical === 'AND' || canonical === 'OR' || !VALID_CODE_PATTERN.test(canonical)) {
          throw new Error(`Invalid requirement syntax: invalid course code "${item}" in requirement`);
        }
        andClause.push(canonical);
      }

      if (andClause.length === 0) {
        throw new Error('Invalid requirement syntax: empty clause in expression');
      }

      dnf.push(andClause);
    }

    return dnf;
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

  function getPrereqs(c) {
    if (!c) return [];
    const prereqs = c.prerequisites !== undefined ? c.prerequisites : [];
    return extractCourseCodes(prereqs);
  }

  // Populate graph from catalog courses
  for (const course of catalogCourses) {
    if (!course || !course.code) continue;
    const code = canonicalizeCode(course.code);
    const prereqs = getPrereqs(course);
    graph.set(code, new Set(prereqs));
  }

  // Add/override target course if provided
  if (targetCode) {
    const canonicalTarget = canonicalizeCode(targetCode);
    const targetPrereqs = proposedPrerequisites ? extractCourseCodes(proposedPrerequisites) : [];
    graph.set(canonicalTarget, new Set(targetPrereqs));
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
function validateCourseRequirements({ code, prerequisites, corequisites, existingCourses = [], batchCodes = new Set() }) {
  const canonical = canonicalizeCode(code);
  const prereqCodes = extractCourseCodes(prerequisites);
  const coreqCodes = extractCourseCodes(corequisites);

  // 1. Self-reference check
  if (canonical) {
    if (prereqCodes.includes(canonical)) {
      throw new Error(`Course cannot require itself as a prerequisite: ${canonical}`);
    }
    if (coreqCodes.includes(canonical)) {
      throw new Error(`Course cannot corequisite itself: ${canonical}`);
    }
  }

  // 2. Referential integrity check
  const knownCodes = new Set();
  for (const c of existingCourses) {
    if (c && c.code) {
      knownCodes.add(canonicalizeCode(c.code));
    }
  }
  for (const bCode of batchCodes) {
    knownCodes.add(canonicalizeCode(bCode));
  }

  for (const p of prereqCodes) {
    if (!knownCodes.has(p)) {
      throw new Error(`Referenced prerequisite course "${p}" does not exist in the catalog`);
    }
  }

  for (const c of coreqCodes) {
    if (!knownCodes.has(c)) {
      throw new Error(`Referenced corequisite course "${c}" does not exist in the catalog`);
    }
  }

  // 3. Prerequisite cycle detection
  const cycle = detectPrerequisiteCycle(canonical, prerequisites, existingCourses);
  if (cycle) {
    throw new Error(`Prerequisite cycle detected: ${cycle.join(' -> ')}`);
  }
}

/**
 * Validates an entire batch of courses (e.g. for bulkCreate or database seeding).
 * Batch-aware: courses defined later in the batch can satisfy requirements of earlier courses.
 */
function validateCourseBatch(courses, existingCourses = []) {
  if (!Array.isArray(courses) || courses.length === 0) return;

  const batchCodes = new Set();
  for (const c of courses) {
    if (!c || !c.code) continue;
    const canonical = canonicalizeCode(c.code);
    if (batchCodes.has(canonical)) {
      throw new Error(`Duplicate course code in batch: ${canonical}`);
    }
    batchCodes.add(canonical);
  }

  // Validate self-reference and referential integrity for each course in the batch
  for (const c of courses) {
    const canonical = canonicalizeCode(c.code);
    const prereqCodes = extractCourseCodes(c.prerequisites);
    const coreqCodes = extractCourseCodes(c.corequisites);

    if (canonical) {
      if (prereqCodes.includes(canonical)) {
        throw new Error(`Course cannot require itself as a prerequisite: ${canonical}`);
      }
      if (coreqCodes.includes(canonical)) {
        throw new Error(`Course cannot corequisite itself: ${canonical}`);
      }
    }

    const knownCodes = new Set();
    for (const ec of existingCourses) {
      if (ec && ec.code) knownCodes.add(canonicalizeCode(ec.code));
    }
    for (const bc of batchCodes) {
      knownCodes.add(bc);
    }

    for (const p of prereqCodes) {
      if (!knownCodes.has(p)) {
        throw new Error(`Referenced prerequisite course "${p}" does not exist in the catalog`);
      }
    }

    for (const coreq of coreqCodes) {
      if (!knownCodes.has(coreq)) {
        throw new Error(`Referenced corequisite course "${coreq}" does not exist in the catalog`);
      }
    }
  }

  // Combined cycle detection on existing + batch courses
  const combined = [...existingCourses, ...courses];
  const cycle = detectPrerequisiteCycle(null, null, combined);
  if (cycle) {
    throw new Error(`Prerequisite cycle detected: ${cycle.join(' -> ')}`);
  }
}

module.exports = {
  canonicalizeCode,
  isValidCourseCode,
  normalizeRequirements,
  extractCourseCodes,
  detectPrerequisiteCycle,
  validateCourseRequirements,
  validateCourseBatch
};
