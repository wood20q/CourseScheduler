import { useState, useMemo } from "react";
import { 
  getAvailableCourseCodes, 
  evaluateDNF, 
  normalizeDNF,
  findCourseCompletedLocation 
} from "../utils/requirementEngine";

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
  const catalogEntry = (catalogCourses || []).find(
    c => String(c.code).trim().toUpperCase() === cleanCode
  ) || course;

  const prereqs = catalogEntry?.prerequisites || course?.prerequisites || [];
  const coreqs = catalogEntry?.corequisites || course?.corequisites || [];

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
                  {normalizedPrereqs.map((clause, cIdx) => {
                    const clauseText = clause.join(' AND ');
                    const isClauseMet = clause.every(code => priorCodes.has(code));
                    const missingCodes = clause.filter(code => !priorCodes.has(code));
                    const firstCompleted = clause.find(code => priorCodes.has(code));
                    const completedLoc = firstCompleted ? findCourseCompletedLocation(schedule, firstCompleted) : null;

                    return (
                      <div key={`prereq-${cIdx}`} className={`audit-item ${isClauseMet ? 'met' : 'missing'}`}>
                        <span className="audit-status-icon">{isClauseMet ? '✅' : '❌'}</span>
                        <div className="audit-item-info">
                          <div className="audit-item-main">
                            <span className="badge-type prereq">Prerequisite</span>
                            <strong className="audit-item-code">{clauseText}</strong>
                          </div>
                          <span className="audit-item-desc">
                            {isClauseMet 
                              ? `Satisfied (${completedLoc ? completedLoc.label : 'Completed prior'})`
                              : `Missing: ${missingCodes.join(', ')} (Must precede ${targetTermLabel})`}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {normalizedCoreqs.map((clause, cIdx) => {
                    const clauseText = clause.join(' AND ');
                    const isClauseMet = clause.every(code => concurrentCodes.has(code));
                    const missingCodes = clause.filter(code => !concurrentCodes.has(code));
                    const firstCompleted = clause.find(code => concurrentCodes.has(code));
                    const completedLoc = firstCompleted ? findCourseCompletedLocation(schedule, firstCompleted) : null;

                    return (
                      <div key={`coreq-${cIdx}`} className={`audit-item ${isClauseMet ? 'met' : 'missing'}`}>
                        <span className="audit-status-icon">{isClauseMet ? '✅' : '❌'}</span>
                        <div className="audit-item-info">
                          <div className="audit-item-main">
                            <span className="badge-type coreq">Corequisite</span>
                            <strong className="audit-item-code">{clauseText}</strong>
                          </div>
                          <span className="audit-item-desc">
                            {isClauseMet 
                              ? `Satisfied (${completedLoc ? completedLoc.label : 'Concurrent or prior'})`
                              : `Missing: ${missingCodes.join(', ')} (Concurrent or prior)`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Waiver Checkbox from Variant A (only shown if requirements are unsatisfied) */}
          {!isSatisfied && (
            <div className="waiver-box">
              <label className="waiver-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={waiverChecked} 
                  onChange={(e) => setWaiverChecked(e.target.checked)} 
                  data-testid="waiver-checkbox"
                />
                <span className="waiver-title">Request Requirement Waiver (Advisor Override)</span>
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
                title="Check 'Request Requirement Waiver' above to add this course"
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
