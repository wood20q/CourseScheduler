/**
 * requirementEngine.js
 * Domain engine for prerequisite/corequisite parsing, evaluation, and schedule graph validation.
 */

/**
 * Normalizes any requirement representation (DNF array, flat array, or boolean string)
 * into canonical Disjunctive Normal Form (DNF): Array<Array<string>>.
 * 
 * Examples:
 * - [["MA101", "MA105"], ["MA303", "MA304"]] -> (MA101 AND MA105) OR (MA303 AND MA304)
 * - ["CS120", "CS220"] -> [["CS120", "CS220"]] (CS120 AND CS220)
 * - "(CS120 AND MATH101) OR CS220" -> [["CS120", "MATH101"], ["CS220"]]
 * - null / [] -> []
 */
export function normalizeDNF(req) {
  if (!req) return [];
  if (typeof req === 'string') {
    const clean = req.trim();
    if (!clean) return [];
    const orClauses = clean.split(/\s+OR\s+|\s*\|\s*/i);
    return orClauses.map(clause => {
      const stripped = clause.replace(/^\(|\)$/g, '').trim();
      const andItems = stripped.split(/\s+AND\s+|\s*,\s*|\s*&\s*/i);
      return andItems.map(c => c.trim().toUpperCase()).filter(Boolean);
    }).filter(clause => clause.length > 0);
  }
  if (Array.isArray(req)) {
    if (req.length === 0) return [];
    if (Array.isArray(req[0])) {
      return req.map(c => c.map(x => String(x).trim().toUpperCase()));
    }
    return [req.map(x => String(x).trim().toUpperCase())];
  }
  return [];
}

/**
 * Evaluates a DNF requirement against a set of satisfied course codes.
 */
export function evaluateDNF(requirement, satisfiedCodes, isWaived = false) {
  const dnf = normalizeDNF(requirement);
  const codeSet = satisfiedCodes instanceof Set 
    ? satisfiedCodes 
    : new Set((satisfiedCodes || []).map(c => String(c).toUpperCase().trim()));

  if (dnf.length === 0) {
    return {
      isSatisfied: true,
      isWaived: false,
      status: 'SATISFIED',
      options: [],
      missingSummary: 'No requirements needed'
    };
  }

  const evaluatedOptions = dnf.map(clause => {
    const missing = clause.filter(code => !codeSet.has(code));
    return {
      required: clause,
      missing,
      isSatisfied: missing.length === 0
    };
  });

  const satisfiedClauseExists = evaluatedOptions.some(opt => opt.isSatisfied);
  const overallSatisfied = satisfiedClauseExists || Boolean(isWaived);

  let status = 'UNSATISFIED';
  if (satisfiedClauseExists) {
    status = 'SATISFIED';
  } else if (isWaived) {
    status = 'WAIVED';
  }

  let missingSummary = '';
  if (satisfiedClauseExists) {
    missingSummary = 'Fulfilled';
  } else if (isWaived) {
    missingSummary = 'Waived by override';
  } else {
    missingSummary = evaluatedOptions
      .map(opt => opt.missing.join(' AND '))
      .join(' OR ');
  }

  return {
    isSatisfied: overallSatisfied,
    isWaived: Boolean(isWaived),
    status,
    options: evaluatedOptions,
    missingSummary
  };
}

/**
 * Traverses schedule and collects all completed course codes available at a specific position.
 * - Pre-college transfer courses are available to all terms.
 * - If includeCurrentTerm is true, also collects other courses in the same term (used for corequisites).
 */
export function getAvailableCourseCodes(schedule, targetLocation, includeCurrentTerm = false) {
  const codes = new Set();
  if (!schedule) return codes;

  // 1. Pre-college transfer courses
  (schedule.transferCourses || []).forEach(tc => {
    if (tc.code) codes.add(String(tc.code).trim().toUpperCase());
    if (tc.satisfiesCourse) codes.add(String(tc.satisfiesCourse).trim().toUpperCase());
  });

  if (targetLocation && targetLocation.type === 'transfer') {
    return codes;
  }

  const targetYear = targetLocation?.year ?? 999;
  const targetTerm = targetLocation?.term ?? 999;
  const excludeIndex = targetLocation?.excludeIndex ?? -1;

  // 2. Regular terms
  (schedule.years || []).forEach((yearList, yIdx) => {
    yearList.forEach((termList, tIdx) => {
      const isPriorTerm = yIdx < targetYear || (yIdx === targetYear && tIdx < targetTerm);
      const isSameTerm = yIdx === targetYear && tIdx === targetTerm;

      if (isPriorTerm || (includeCurrentTerm && isSameTerm)) {
        termList.forEach((course, cIdx) => {
          if (isSameTerm && cIdx === excludeIndex) return;

          if (course.code) codes.add(String(course.code).trim().toUpperCase());
          if (course.satisfiesCourse) codes.add(String(course.satisfiesCourse).trim().toUpperCase());
        });
      }
    });
  });

  return codes;
}

/**
 * Validates an entire schedule and returns diagnostics mapped by course id/key.
 */
export function validateSchedule(schedule, catalogCourses = []) {
  const catalogMap = new Map();
  (catalogCourses || []).forEach(c => {
    if (c?.code) catalogMap.set(String(c.code).trim().toUpperCase(), c);
  });

  const diagnostics = [];
  let totalCourses = 0;
  let unsatisfiedCount = 0;
  let waivedCount = 0;

  // Transfer courses
  (schedule?.transferCourses || []).forEach((course, cIdx) => {
    totalCourses++;
    diagnostics.push({
      id: `transfer-${cIdx}`,
      courseCode: course.code,
      location: { type: 'transfer', index: cIdx },
      prereqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Pre-college credit' },
      coreqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'None' },
      overallStatus: 'SATISFIED',
      hasFlag: false
    });
  });

  // Regular years/terms
  (schedule?.years || []).forEach((yearList, yIdx) => {
    yearList.forEach((termList, tIdx) => {
      termList.forEach((course, cIdx) => {
        totalCourses++;
        const cleanCode = String(course?.code || '').trim().toUpperCase();
        const catCourse = catalogMap.get(cleanCode) || course;

        const priorCodes = getAvailableCourseCodes(schedule, {
          type: 'term',
          year: yIdx,
          term: tIdx,
          excludeIndex: cIdx
        }, false);

        const concurrentCodes = getAvailableCourseCodes(schedule, {
          type: 'term',
          year: yIdx,
          term: tIdx,
          excludeIndex: cIdx
        }, true);

        const isWaived = Boolean(course?.isWaived);
        const prereqResult = evaluateDNF(catCourse?.prerequisites, priorCodes, isWaived);
        const coreqResult = evaluateDNF(catCourse?.corequisites, concurrentCodes, isWaived);

        const hasRequirements = normalizeDNF(catCourse?.prerequisites).length > 0 || normalizeDNF(catCourse?.corequisites).length > 0;

        let overallStatus = 'SATISFIED';
        if (prereqResult.status === 'UNSATISFIED' || coreqResult.status === 'UNSATISFIED') {
          overallStatus = 'UNSATISFIED';
          unsatisfiedCount++;
        } else if (prereqResult.status === 'WAIVED' || coreqResult.status === 'WAIVED') {
          overallStatus = 'WAIVED';
          waivedCount++;
        }

        diagnostics.push({
          id: `term-${yIdx}-${tIdx}-${cIdx}`,
          courseCode: course.code,
          location: { type: 'term', year: yIdx, term: tIdx, index: cIdx },
          prereqResult,
          coreqResult,
          overallStatus,
          hasRequirements,
          hasFlag: hasRequirements,
          isUnsatisfied: overallStatus === 'UNSATISFIED',
          isWaived: overallStatus === 'WAIVED',
          missingSummary: prereqResult.status === 'UNSATISFIED' 
            ? `Prereq: ${prereqResult.missingSummary}`
            : coreqResult.status === 'UNSATISFIED' 
              ? `Coreq: ${coreqResult.missingSummary}`
              : overallStatus === 'WAIVED'
                ? 'Waived by override'
                : 'All requirements satisfied'
        });
      });
    });
  });

  return {
    diagnostics,
    diagnosticsMap: new Map(diagnostics.map(d => [d.id, d])),
    summary: {
      totalCourses,
      unsatisfiedCount,
      waivedCount,
      isValid: unsatisfiedCount === 0
    }
  };
}
