/**
 * requirementEngine.js
 * Domain engine for prerequisite/corequisite parsing, evaluation, and schedule graph validation.
 */
import { removeCourseFromSchedule, moveCourseInSchedule } from './scheduleMigration';

/**
 * Canonicalizes a course code by trimming, uppercasing, and collapsing internal whitespace
 * between subject letters and numbers (e.g. "MA 101" -> "MA101", "CS 120" -> "CS120").
 */
export function canonicalizeCode(code) {
  if (!code) return '';
  return String(code).replace(/[()]/g, '').trim().toUpperCase().replace(/\s+/g, '');
}

export const canonicalizeCourseCode = canonicalizeCode;

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
      const stripped = clause.replace(/^\(+|\)+$/g, '').trim();
      const andItems = stripped.split(/\s+AND\s+|\s*,\s*|\s*&\s*/i);
      return andItems.map(c => canonicalizeCode(c)).filter(Boolean);
    }).filter(clause => clause.length > 0);
  }
  if (Array.isArray(req)) {
    if (req.length === 0) return [];
    if (Array.isArray(req[0])) {
      return req.map(c => c.map(x => canonicalizeCode(x)).filter(Boolean)).filter(clause => clause.length > 0);
    }
    const flat = req.map(x => canonicalizeCode(x)).filter(Boolean);
    return flat.length > 0 ? [flat] : [];
  }
  return [];
}

/**
 * Evaluates a DNF requirement against a set of satisfied course codes.
 */
export function evaluateDNF(requirement, satisfiedCodes, isWaived = false) {
  const dnf = normalizeDNF(requirement);
  const codeSet = satisfiedCodes instanceof Set 
    ? new Set(Array.from(satisfiedCodes).map(canonicalizeCode).filter(Boolean)) 
    : new Set((satisfiedCodes || []).map(canonicalizeCode).filter(Boolean));

  if (dnf.length === 0) {
    return {
      isSatisfied: true,
      isWaived: false,
      status: 'SATISFIED',
      options: [],
      missingSummary: 'No requirements needed',
      unfulfilledSummary: ''
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

  const unfulfilledSummary = satisfiedClauseExists
    ? ''
    : evaluatedOptions.map(opt => opt.missing.join(' AND ')).join(' OR ');

  let missingSummary;
  if (satisfiedClauseExists) {
    missingSummary = 'Fulfilled';
  } else if (isWaived) {
    missingSummary = 'Waived by advisor waiver';
  } else {
    missingSummary = unfulfilledSummary;
  }

  return {
    isSatisfied: overallSatisfied,
    isWaived: Boolean(isWaived),
    status,
    options: evaluatedOptions,
    missingSummary,
    unfulfilledSummary
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
    if (tc.code) {
      const code = canonicalizeCode(tc.code);
      if (code) codes.add(code);
    }
    if (tc.satisfiesCourse) {
      const sat = canonicalizeCode(tc.satisfiesCourse);
      if (sat) codes.add(sat);
    }
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

          if (course.code) {
            const code = canonicalizeCode(course.code);
            if (code) codes.add(code);
          }
          if (course.satisfiesCourse) {
            const sat = canonicalizeCode(course.satisfiesCourse);
            if (sat) codes.add(sat);
          }
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
    if (c?.code) catalogMap.set(canonicalizeCode(c.code), c);
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
      prereqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'Pre-college credit', unfulfilledSummary: '' },
      coreqResult: { isSatisfied: true, status: 'SATISFIED', missingSummary: 'None', unfulfilledSummary: '' },
      overallStatus: 'SATISFIED',
      hasFlag: false,
      unfulfilledSummary: ''
    });
  });

  // Regular years/terms
  (schedule?.years || []).forEach((yearList, yIdx) => {
    yearList.forEach((termList, tIdx) => {
      termList.forEach((course, cIdx) => {
        totalCourses++;
        const cleanCode = canonicalizeCode(course?.code);
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

        const unfulfilledParts = [];
        if (prereqResult.unfulfilledSummary) unfulfilledParts.push(`Prereq: ${prereqResult.unfulfilledSummary}`);
        if (coreqResult.unfulfilledSummary) unfulfilledParts.push(`Coreq: ${coreqResult.unfulfilledSummary}`);
        const unfulfilledText = unfulfilledParts.join('; ');

        const missingParts = [];
        if (prereqResult.status === 'UNSATISFIED') missingParts.push(`Prereq: ${prereqResult.missingSummary}`);
        if (coreqResult.status === 'UNSATISFIED') missingParts.push(`Coreq: ${coreqResult.missingSummary}`);

        let missingSummaryText;
        if (missingParts.length > 0) {
          missingSummaryText = missingParts.join('; ');
        } else if (overallStatus === 'WAIVED') {
          missingSummaryText = 'Waived by advisor waiver';
        } else {
          missingSummaryText = 'All requirements satisfied';
        }

        diagnostics.push({
          id: `term-${yIdx}-${tIdx}-${cIdx}`,
          courseCode: course.code,
          location: { type: 'term', year: yIdx, term: tIdx, index: cIdx },
          prereqResult,
          coreqResult,
          overallStatus,
          hasRequirements,
          hasFlag: overallStatus === 'UNSATISFIED' || overallStatus === 'WAIVED',
          isUnsatisfied: overallStatus === 'UNSATISFIED',
          isWaived: overallStatus === 'WAIVED',
          unfulfilledSummary: unfulfilledText,
          missingSummary: missingSummaryText
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

/**
 * Simulates a schedule mutation (e.g. moving or removing a course)
 * and determines if any downstream courses have their requirements broken.
 * Returns { hasDownstreamImpact: boolean, affectedCourses: Array<AffectedCourse> }.
 */
export function simulateScheduleMutation(schedule, courseCode, action, targetLocation = null, catalogCourses = []) {
  if (!schedule || !courseCode) {
    return { hasDownstreamImpact: false, affectedCourses: [] };
  }

  const cleanCode = canonicalizeCode(courseCode);
  const baseline = validateSchedule(schedule, catalogCourses);
  const baselineMap = new Map();
  baseline.diagnostics.forEach(d => {
    baselineMap.set(canonicalizeCode(d.courseCode), d);
  });

  let mutatedSchedule;
  if (action === 'remove') {
    mutatedSchedule = removeCourseFromSchedule(schedule, cleanCode);
  } else if (action === 'move') {
    mutatedSchedule = moveCourseInSchedule(schedule, cleanCode, targetLocation);
  } else {
    return { hasDownstreamImpact: false, affectedCourses: [] };
  }

  const mutated = validateSchedule(mutatedSchedule, catalogCourses);
  const affectedCourses = [];

  mutated.diagnostics.forEach(newDiag => {
    const code = canonicalizeCode(newDiag.courseCode);
    if (code === cleanCode) return;

    const prevDiag = baselineMap.get(code);
    if (!prevDiag) return;

    // Check if prerequisite or corequisite was satisfied before but is now unsatisfied
    const prereqBroken = prevDiag.prereqResult?.isSatisfied && !newDiag.prereqResult?.isSatisfied;
    const coreqBroken = prevDiag.coreqResult?.isSatisfied && !newDiag.coreqResult?.isSatisfied;

    if (prereqBroken || coreqBroken) {
      const locLabel = newDiag.location.type === 'transfer'
        ? 'Pre-College / Transfer Credits'
        : `Year ${newDiag.location.year + 1}, Term ${newDiag.location.term + 1}`;

      const reason = prereqBroken
        ? `Missing prerequisite: ${newDiag.prereqResult.missingSummary}`
        : `Missing corequisite: ${newDiag.coreqResult.missingSummary}`;

      affectedCourses.push({
        id: newDiag.id,
        courseCode: newDiag.courseCode,
        locationLabel: locLabel,
        location: newDiag.location,
        reason,
        prereqResult: newDiag.prereqResult,
        coreqResult: newDiag.coreqResult
      });
    }
  });

  return {
    hasDownstreamImpact: affectedCourses.length > 0,
    affectedCourses
  };
}
