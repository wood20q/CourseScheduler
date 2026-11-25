import { useState, useMemo } from "react";
import { 
  getAvailableCourseCodes, 
  evaluateDNF, 
  normalizeDNF
} from "../utils/requirementEngine";
import { findCourseInSchedule } from "../utils/scheduleMigration";

function RequirementAuditItem({ 
  type, 
  clause, 
  satisfiedCodes, 
  schedule, 
  targetTermLabel,
  isOverallRequirementSatisfied,
  hasMultipleOptions
}) {
  const clauseText = clause.join(' AND ');
  const isClauseMet = clause.every(code => satisfiedCodes.has(code));
  const missingCodes = clause.filter(code => !satisfiedCodes.has(code));
  const firstCompleted = clause.find(code => satisfiedCodes.has(code));
  const completedLoc = firstCompleted ? findCourseInSchedule(schedule, firstCompleted) : null;

  const isPrereq = type === 'prereq';
  const typeLabel = isPrereq ? 'Prerequisite' : 'Corequisite';
  const timingLabel = isPrereq ? `Must precede ${targetTermLabel}` : 'Concurrent or prior';

  let statusClass = 'missing';
  let statusIcon = '❌';
  let descText = `Missing: ${missingCodes.join(', ')} (${timingLabel})`;

  if (isClauseMet) {
    statusClass = 'met';
    statusIcon = '✅';
    descText = `Satisfied (${completedLoc ? completedLoc.locationLabel : 'Completed prior'})`;
  } else if (isOverallRequirementSatisfied) {
    // When the course requirement is satisfied via another alternative OR clause
    statusClass = 'alternative';
    statusIcon = '⚪';
    descText = `Alternative option (${missingCodes.join(', ')} not required; requirement fulfilled via alternative)`;
  }

  return (
    <div className={`audit-item ${statusClass}`}>
      <span className="audit-status-icon">{statusIcon}</span>
      <div className="audit-item-info">
        <div className="audit-item-main">
          <span className={`badge-type ${type}`}>{typeLabel}{hasMultipleOptions ? ' Option' : ''}</span>
          <strong className="audit-item-code">{clauseText}</strong>
        </div>
        <span className="audit-item-desc">{descText}</span>
      </div>
    </div>
  );
}

function AddCourseDialog({ 
  course, 
  schedule = { transferCourses: [], years: [[[], [], []], [[], [], []], [[], [], []], [[], [], []]] },
  catalogCourses = [],
  onClose, 
  onConfirm 
}) {
  const [selectedYear, setSelectedYear] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState(0);
  const [waiverChecked, setWaiverChecked] = useState(false);

  // Retrieve course requirements from catalog or course object
  const cleanCode = String(course?.code || '').trim().toUpperCase();
  const catalogEntry = useMemo(() => {
    return (catalogCourses || []).find(
      c => String(c.code).trim().toUpperCase() === cleanCode
    ) || course;
  }, [catalogCourses, cleanCode, course]);

  const prereqs = useMemo(() => {
    return catalogEntry?.prerequisites || course?.prerequisites || null;
  }, [catalogEntry, course]);

  const coreqs = useMemo(() => {
    return catalogEntry?.corequisites || course?.corequisites || null;
  }, [catalogEntry, course]);

  const priorCodes = useMemo(() => {
    return getAvailableCourseCodes(schedule, {
      type: 'term',
      year: selectedYear,
      term: selectedTerm
    }, false);
  }, [schedule, selectedYear, selectedTerm]);

  const concurrentCodes = useMemo(() => {
    return getAvailableCourseCodes(schedule, {
      type: 'term',
      year: selectedYear,
      term: selectedTerm
    }, true);
  }, [schedule, selectedYear, selectedTerm]);

  const prereqEvaluation = useMemo(() => {
    return evaluateDNF(prereqs, priorCodes, false);
  }, [prereqs, priorCodes]);

  const coreqEvaluation = useMemo(() => {
    return evaluateDNF(coreqs, concurrentCodes, false);
  }, [coreqs, concurrentCodes]);

  const normalizedPrereqs = useMemo(() => normalizeDNF(prereqs), [prereqs]);
  const normalizedCoreqs = useMemo(() => normalizeDNF(coreqs), [coreqs]);

  const hasPrereqs = normalizedPrereqs.length > 0;
  const hasCoreqs = normalizedCoreqs.length > 0;
  const hasRequirements = hasPrereqs || hasCoreqs;

  const isPrereqSatisfied = !hasPrereqs || prereqEvaluation.status === 'SATISFIED';
  const isCoreqSatisfied = !hasCoreqs || coreqEvaluation.status === 'SATISFIED';
  const isSatisfied = isPrereqSatisfied && isCoreqSatisfied;

  const targetTermLabel = `Year ${selectedYear + 1}, Term ${selectedTerm + 1}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSatisfied && !waiverChecked) return;
    const courseToAdd = (!isSatisfied && waiverChecked) 
      ? { ...course, isWaived: true } 
      : { ...course };
    onConfirm([selectedYear, selectedTerm], courseToAdd);
    onClose();
  };

  return (
    <div className="dialogOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-course-title">
      <div className="dialogWrapper addCourseDialogWrapper" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHeaderRow">
          <h2 id="add-course-title">Add Course to Schedule</h2>
        </div>

        <p className="dialogCourseName">
          <strong>{course.code}:</strong> {course.name} ({course.credits} credit(s))
        </p>

        <form onSubmit={handleSubmit} className="add-course-form">
          <div className="term-selector-row">
            <div className="formGroup term-inline-group" id="yearWrapper">
              <label htmlFor="year-select">Year:</label>
              <select 
                name="year-select" 
                id="year-select" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                <option value={0}>Year 1</option>
                <option value={1}>Year 2</option>
                <option value={2}>Year 3</option>
                <option value={3}>Year 4</option>
              </select>
            </div>
            <div className="formGroup term-inline-group" id="termWrapper">
              <label htmlFor="term-select">Term:</label>
              <select 
                name="term-select" 
                id="term-select" 
                value={selectedTerm} 
                onChange={(e) => setSelectedTerm(Number(e.target.value))}
              >
                <option value={0}>Term 1</option>
                <option value={1}>Term 2</option>
                <option value={2}>Term 3</option>
              </select>
            </div>
          </div>

          {/* Requirement Audit Card */}
          <div className="requirement-audit-card">
            <div className="audit-card-header">
              <div className="audit-title-group">
                <span className="audit-card-title">Requirement Audit</span>
                <span className="audit-target-term">for {targetTermLabel}</span>
              </div>
              <span className={`audit-badge ${isSatisfied ? 'satisfied' : 'unsatisfied'}`}>
                {isSatisfied ? 'Eligible' : 'Requirements Incomplete'}
              </span>
            </div>

            <div className="audit-card-body">
              {!hasRequirements ? (
                <div className="audit-empty-notice">
                  <span className="icon">✓</span> No prerequisites or corequisites required.
                </div>
              ) : (
                <div className="audit-checklist">
                  {normalizedPrereqs.map((clause, cIdx) => (
                    <RequirementAuditItem 
                      key={`prereq-${cIdx}`}
                      type="prereq"
                      clause={clause}
                      satisfiedCodes={priorCodes}
                      schedule={schedule}
                      targetTermLabel={targetTermLabel}
                      isOverallRequirementSatisfied={isPrereqSatisfied}
                      hasMultipleOptions={normalizedPrereqs.length > 1}
                    />
                  ))}

                  {normalizedCoreqs.map((clause, cIdx) => (
                    <RequirementAuditItem 
                      key={`coreq-${cIdx}`}
                      type="coreq"
                      clause={clause}
                      satisfiedCodes={concurrentCodes}
                      schedule={schedule}
                      targetTermLabel={targetTermLabel}
                      isOverallRequirementSatisfied={isCoreqSatisfied}
                      hasMultipleOptions={normalizedCoreqs.length > 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Waiver Checkbox (only shown if requirements are unsatisfied) */}
          {!isSatisfied && (
            <div className="waiver-box">
              <label className="waiver-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={waiverChecked} 
                  onChange={(e) => setWaiverChecked(e.target.checked)} 
                  data-testid="waiver-checkbox"
                />
                <span className="waiver-title">Request Advisor Requirement Waiver</span>
              </label>
              <p className="waiver-caption">
                Allow placement despite missing coursework. Course will appear on schedule with a requirement waiver indicator.
              </p>
            </div>
          )}

          <div className="formGroup buttons">
            <button type="button" className="btn-close" onClick={onClose}>Close</button>
            {isSatisfied ? (
              <button type="submit" className="btn-submit" data-testid="submit-add-course">
                Add to Schedule
              </button>
            ) : waiverChecked ? (
              <button 
                type="submit" 
                className="btn-submit btn-waived-action"
                data-testid="submit-add-course-waived"
              >
                ⚡ Add with Waiver
              </button>
            ) : (
              <button 
                type="button" 
                className="btn-submit btn-disabled" 
                disabled 
                title="Check 'Request Advisor Requirement Waiver' above to add this course"
                data-testid="submit-add-course-disabled"
              >
                Add to Schedule (Requires Waiver)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCourseDialog;
