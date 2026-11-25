import React, { useState, useMemo } from 'react';
import { formatLocationKey, parseLocation } from '../../utils/scheduleMigration';
import { simulateScheduleMutation, findCourseCompletedLocation } from '../../utils/requirementEngine';

/**
 * Common helper to format current location string
 */
function formatCurrentLocation(currentTerm) {
  const parsed = parseLocation(currentTerm);
  if (parsed.type === 'transfer') {
    return 'Pre-College / Transfer Credits';
  }
  return `Year ${parsed.year + 1}, Term ${parsed.term + 1}`;
}

// ============================================================================
// VARIANT A: Inline Accordion Warning & Compact Waiver Toggle
// ============================================================================
export function ManageCourseVariantA({
  course,
  schedule,
  catalogCourses = [],
  onClose,
  onRemove,
  onMove,
  onUpdate,
  onToggleWaiver,
  courseValidation
}) {
  const isTransfer = Boolean(course?.isTransfer);
  const initialLocation = course?.currentTerm ? formatLocationKey(course.currentTerm) : '0,0';
  const [targetLocation, setTargetLocation] = useState(initialLocation);
  const parsedCurrent = parseLocation(course?.currentTerm);
  const [selectedYear, setSelectedYear] = useState(parsedCurrent.type === 'term' ? parsedCurrent.year : 0);
  const [selectedTerm, setSelectedTerm] = useState(parsedCurrent.type === 'term' ? parsedCurrent.term : 0);

  // Downstream warnings acknowledgment
  const [moveWarningAck, setMoveWarningAck] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Compute target location for simulation
  const effectiveTarget = isTransfer
    ? (targetLocation === 'transfer' ? 'transfer' : targetLocation.split(',').map(Number))
    : [selectedYear, selectedTerm];

  // Live downstream simulation for move
  const moveSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'move', effectiveTarget, catalogCourses);
  }, [schedule, course?.code, effectiveTarget, catalogCourses]);

  // Live downstream simulation for remove
  const removeSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'remove', null, catalogCourses);
  }, [schedule, course?.code, catalogCourses]);

  const isSatisfied = courseValidation?.overallStatus === 'SATISFIED';
  const isWaived = Boolean(course?.isWaived || courseValidation?.isWaived);
  const isUnsatisfied = !isSatisfied && !isWaived;

  const handleMoveSubmit = (e) => {
    e.preventDefault();
    if (moveSimulation.hasDownstreamImpact && !moveWarningAck) {
      return;
    }
    onMove(effectiveTarget, course.code);
    onClose();
  };

  const handleConfirmRemove = () => {
    onRemove(course.code);
    onClose();
  };

  return (
    <div className="manage-variant-a">
      {/* Course Header Info */}
      <div className="dialogCourseInfo">
        <div className="dialogCourseTitleRow">
          <p className="dialogCourseName">
            <strong>{course.code}:</strong> {course.name}
          </p>
          {isTransfer && <span className="transferBadge">Transfer</span>}
        </div>
        <p className="dialogCourseCredits">
          <strong>Credits:</strong> {course.credits}
        </p>
        <p className="dialogCourseCurrentTerm">
          <strong>Current Location:</strong> {formatCurrentLocation(course.currentTerm)}
        </p>
        {isTransfer && (
          <>
            <p className="dialogCourseInstitution">
              <strong>Institution:</strong> {course.institution || "None"}
            </p>
            <p className="dialogCourseSatisfies">
              <strong>Satisfies:</strong> {course.satisfiesCourse || "None / General Elective"}
            </p>
          </>
        )}
        <p className="dialogCourseDescription">
          <strong>Description:</strong> {course.description || "None"}
        </p>
      </div>

      {/* Requirement Audit & Waiver Strip (Variant A) */}
      <div className="variant-a-requirement-strip">
        <div className="variant-a-req-header">
          <span className="variant-a-req-title">Prerequisite Status:</span>
          {isSatisfied && (
            <span className="audit-badge badge-satisfied">✅ Requirements Met</span>
          )}
          {isWaived && (
            <span className="audit-badge badge-waived">🏷️ Waived by Override</span>
          )}
          {isUnsatisfied && (
            <span className="audit-badge badge-unsatisfied">⚠️ Requirements Incomplete</span>
          )}
        </div>

        {/* Missing rule description */}
        {isUnsatisfied && courseValidation?.missingSummary && (
          <p className="variant-a-missing-desc">
            Missing: <strong>{courseValidation.missingSummary}</strong>
          </p>
        )}

        {/* Waiver Toggle: Only available if not already satisfied */}
        {!isSatisfied && (
          <div className="variant-a-waiver-container">
            <label className="waiver-checkbox-label">
              <input
                type="checkbox"
                checked={isWaived}
                onChange={() => onToggleWaiver && onToggleWaiver(course.code)}
              />
              <span>Advisor Requirement Waiver</span>
            </label>
            <span className="waiver-caption">
              {isWaived 
                ? "Waiver granted. Click to revoke waiver and reinstate requirement checks."
                : "Override prerequisite checks and permit out-of-sequence completion."}
            </span>
          </div>
        )}
      </div>

      <hr className="dialogDivider" />

      {/* Move Course Form */}
      <form onSubmit={handleMoveSubmit} className="variant-a-move-form">
        <h3 className="dialogSubheading">Move Course</h3>
        {isTransfer ? (
          <div className="formGroup">
            <label htmlFor="move-location-select-a">Target Location:</label>
            <select
              id="move-location-select-a"
              value={targetLocation}
              onChange={(e) => {
                setTargetLocation(e.target.value);
                setMoveWarningAck(false);
              }}
            >
              <option value="transfer">Pre-College / Transfer Credits</option>
              <optgroup label="Academic Years">
                <option value="0,0">Year 1 Term 1</option>
                <option value="0,1">Year 1 Term 2</option>
                <option value="0,2">Year 1 Term 3</option>
                <option value="1,0">Year 2 Term 1</option>
                <option value="1,1">Year 2 Term 2</option>
                <option value="1,2">Year 2 Term 3</option>
                <option value="2,0">Year 3 Term 1</option>
                <option value="2,1">Year 3 Term 2</option>
                <option value="2,2">Year 3 Term 3</option>
                <option value="3,0">Year 4 Term 1</option>
                <option value="3,1">Year 4 Term 2</option>
                <option value="3,2">Year 4 Term 3</option>
              </optgroup>
            </select>
          </div>
        ) : (
          <div className="variant-b-term-row">
            <div className="formGroup term-inline-group">
              <label htmlFor="move-year-select-a">Target Year:</label>
              <select
                id="move-year-select-a"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setMoveWarningAck(false);
                }}
              >
                <option value={0}>Year 1</option>
                <option value={1}>Year 2</option>
                <option value={2}>Year 3</option>
                <option value={3}>Year 4</option>
              </select>
            </div>
            <div className="formGroup term-inline-group">
              <label htmlFor="move-term-select-a">Target Term:</label>
              <select
                id="move-term-select-a"
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(Number(e.target.value));
                  setMoveWarningAck(false);
                }}
              >
                <option value={0}>Term 1</option>
                <option value={1}>Term 2</option>
                <option value={2}>Term 3</option>
              </select>
            </div>
          </div>
        )}

        {/* Downstream Impact Accordion Alert */}
        {moveSimulation.hasDownstreamImpact && (
          <div className="variant-a-downstream-card">
            <div className="variant-a-downstream-header">
              <span className="downstream-icon">⚠️</span>
              <strong>Downstream Conflict Warning:</strong>
            </div>
            <p className="downstream-summary">
              Moving {course.code} will invalidate prerequisites for{' '}
              <strong>{moveSimulation.affectedCourses.length}</strong> downstream scheduled course(s).
            </p>
            <button
              type="button"
              className="btn-accordion-toggle"
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            >
              {isAccordionOpen ? 'Hide Impacted Courses ▲' : `View Impacted Courses (${moveSimulation.affectedCourses.length}) ▼`}
            </button>
            {isAccordionOpen && (
              <ul className="downstream-list">
                {moveSimulation.affectedCourses.map((c) => (
                  <li key={c.id || c.courseCode} className="downstream-item">
                    <span className="downstream-code">{c.courseCode}</span>
                    <span className="downstream-loc">({c.locationLabel})</span>
                    <span className="downstream-reason">— {c.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <label className="downstream-ack-label">
              <input
                type="checkbox"
                checked={moveWarningAck}
                onChange={(e) => setMoveWarningAck(e.target.checked)}
              />
              <span>I understand affected downstream courses will show ⚠️ Missing Req flags</span>
            </label>
          </div>
        )}

        <div className="formGroup">
          <button
            type="submit"
            className={`btn-submit ${moveSimulation.hasDownstreamImpact && !moveWarningAck ? 'btn-disabled' : ''}`}
            disabled={moveSimulation.hasDownstreamImpact && !moveWarningAck}
          >
            {moveSimulation.hasDownstreamImpact ? '⚡ Move Course (With Warnings)' : 'Move Course'}
          </button>
        </div>
      </form>

      <hr className="dialogDivider" />

      {/* Danger Zone */}
      <div className="dialogDangerZone">
        {!isConfirmingDelete ? (
          <button
            type="button"
            className="btn-danger"
            onClick={() => setIsConfirmingDelete(true)}
          >
            Remove Course from Schedule
          </button>
        ) : (
          <div className="deleteConfirmBox">
            <p className="deleteConfirmWarning">
              Are you sure you want to remove <strong>{course.code}</strong> from your schedule?
            </p>
            {removeSimulation.hasDownstreamImpact && (
              <div className="variant-a-remove-warning">
                <p className="remove-warning-text">
                  ⚠️ <strong>Notice:</strong> Removing this course invalidates prerequisites for{' '}
                  <strong>{removeSimulation.affectedCourses.length}</strong> downstream course(s):
                </p>
                <ul className="downstream-list compact">
                  {removeSimulation.affectedCourses.map((c) => (
                    <li key={c.id || c.courseCode}>
                      <strong>{c.courseCode}</strong> ({c.locationLabel})
                    </li>
                  ))}
                </ul>
                <p className="remove-reassurance">
                  Affected courses will remain on the schedule with ⚠️ Missing Req flags.
                </p>
              </div>
            )}
            <div className="deleteConfirmButtons">
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={handleConfirmRemove}
              >
                Yes, Remove Course
              </button>
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="formGroup buttons">
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// VARIANT B: Dedicated Interstitial Confirmation Modal & Full Audit Card
// ============================================================================
export function ManageCourseVariantB({
  course,
  schedule,
  catalogCourses = [],
  onClose,
  onRemove,
  onMove,
  onUpdate,
  onToggleWaiver,
  courseValidation
}) {
  const isTransfer = Boolean(course?.isTransfer);
  const initialLocation = course?.currentTerm ? formatLocationKey(course.currentTerm) : '0,0';
  const [targetLocation, setTargetLocation] = useState(initialLocation);
  const parsedCurrent = parseLocation(course?.currentTerm);
  const [selectedYear, setSelectedYear] = useState(parsedCurrent.type === 'term' ? parsedCurrent.year : 0);
  const [selectedTerm, setSelectedTerm] = useState(parsedCurrent.type === 'term' ? parsedCurrent.term : 0);

  // Interstitial modal state
  const [interstitialModal, setInterstitialModal] = useState(null); // { type: 'move'|'remove', simulation, targetLoc }
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const effectiveTarget = isTransfer
    ? (targetLocation === 'transfer' ? 'transfer' : targetLocation.split(',').map(Number))
    : [selectedYear, selectedTerm];

  // Requirements breakdown
  const catCourse = catalogCourses.find(c => c.code === course?.code) || course;
  const isSatisfied = courseValidation?.overallStatus === 'SATISFIED';
  const isWaived = Boolean(course?.isWaived || courseValidation?.isWaived);
  const isUnsatisfied = !isSatisfied && !isWaived;

  const handleMoveClick = (e) => {
    e.preventDefault();
    const sim = simulateScheduleMutation(schedule, course.code, 'move', effectiveTarget, catalogCourses);
    if (sim.hasDownstreamImpact) {
      setInterstitialModal({
        type: 'move',
        simulation: sim,
        targetLoc: effectiveTarget
      });
    } else {
      onMove(effectiveTarget, course.code);
      onClose();
    }
  };

  const handleRemoveClick = () => {
    const sim = simulateScheduleMutation(schedule, course.code, 'remove', null, catalogCourses);
    if (sim.hasDownstreamImpact) {
      setInterstitialModal({
        type: 'remove',
        simulation: sim,
        targetLoc: null
      });
    } else {
      setIsConfirmingDelete(true);
    }
  };

  const handleConfirmInterstitial = () => {
    if (interstitialModal?.type === 'move') {
      onMove(interstitialModal.targetLoc, course.code);
    } else if (interstitialModal?.type === 'remove') {
      onRemove(course.code);
    }
    setInterstitialModal(null);
    onClose();
  };

  return (
    <div className="manage-variant-b">
      {/* Course Info */}
      <div className="dialogCourseInfo">
        <div className="dialogCourseTitleRow">
          <p className="dialogCourseName">
            <strong>{course.code}:</strong> {course.name}
          </p>
          {isTransfer && <span className="transferBadge">Transfer</span>}
        </div>
        <p className="dialogCourseCredits">
          <strong>Credits:</strong> {course.credits}
        </p>
        <p className="dialogCourseCurrentTerm">
          <strong>Current Location:</strong> {formatCurrentLocation(course.currentTerm)}
        </p>
        {isTransfer && (
          <>
            <p className="dialogCourseInstitution">
              <strong>Institution:</strong> {course.institution || "None"}
            </p>
            <p className="dialogCourseSatisfies">
              <strong>Satisfies:</strong> {course.satisfiesCourse || "None / General Elective"}
            </p>
          </>
        )}
        <p className="dialogCourseDescription">
          <strong>Description:</strong> {course.description || "None"}
        </p>
      </div>

      {/* Embedded Requirement Audit Card (Matching Add Course Dialog Variant D) */}
      <div className="requirement-audit-card">
        <div className="audit-card-header">
          <div className="audit-title-group">
            <span className="audit-icon">🔍</span>
            <span className="audit-card-title">Requirement Audit</span>
          </div>
          {isSatisfied && <span className="audit-badge badge-satisfied">Eligible</span>}
          {isWaived && <span className="audit-badge badge-waived">Waived</span>}
          {isUnsatisfied && <span className="audit-badge badge-unsatisfied">Requirements Incomplete</span>}
        </div>
        <div className="audit-card-body">
          {(!catCourse.prerequisites || catCourse.prerequisites.length === 0) &&
           (!catCourse.corequisites || catCourse.corequisites.length === 0) ? (
            <p className="audit-none-text">No prerequisite or corequisite requirements for this course.</p>
          ) : (
            <ul className="audit-checklist">
              {courseValidation?.prereqResult?.options?.map((opt, i) => (
                <li key={`prereq-${i}`} className={`audit-checklist-item ${opt.isSatisfied ? 'item-met' : 'item-missing'}`}>
                  <span className="audit-item-icon">{opt.isSatisfied ? '✅' : '❌'}</span>
                  <div className="audit-item-info">
                    <span className="audit-item-req-type">Prerequisite</span>
                    <strong className="audit-item-code">{opt.required.join(' OR ')}</strong>
                    <span className="audit-item-desc">
                      {opt.isSatisfied ? 'Fulfilled in schedule' : `Missing: ${opt.missing.join(', ')}`}
                    </span>
                  </div>
                </li>
              ))}
              {courseValidation?.coreqResult?.options?.map((opt, i) => (
                <li key={`coreq-${i}`} className={`audit-checklist-item ${opt.isSatisfied ? 'item-met' : 'item-missing'}`}>
                  <span className="audit-item-icon">{opt.isSatisfied ? '✅' : '❌'}</span>
                  <div className="audit-item-info">
                    <span className="audit-item-req-type">Corequisite</span>
                    <strong className="audit-item-code">{opt.required.join(' OR ')}</strong>
                    <span className="audit-item-desc">
                      {opt.isSatisfied ? 'Fulfilled' : `Missing: ${opt.missing.join(', ')}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Waiver Management Actions: Removed if requirements are met */}
          {!isSatisfied && (
            <div className="variant-b-audit-actions">
              {isWaived ? (
                <button
                  type="button"
                  className="btn-revoke-waiver"
                  onClick={() => onToggleWaiver && onToggleWaiver(course.code)}
                >
                  ↩️ Revoke Requirement Waiver
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-grant-waiver"
                  onClick={() => onToggleWaiver && onToggleWaiver(course.code)}
                >
                  ⚡ Waive Requirements for this Course
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <hr className="dialogDivider" />

      {/* Move Course Form */}
      <form onSubmit={handleMoveClick} className="variant-b-move-form">
        <h3 className="dialogSubheading">Move Course</h3>
        {isTransfer ? (
          <div className="formGroup">
            <label htmlFor="move-location-select-b">Target Location:</label>
            <select
              id="move-location-select-b"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
            >
              <option value="transfer">Pre-College / Transfer Credits</option>
              <optgroup label="Academic Years">
                <option value="0,0">Year 1 Term 1</option>
                <option value="0,1">Year 1 Term 2</option>
                <option value="0,2">Year 1 Term 3</option>
                <option value="1,0">Year 2 Term 1</option>
                <option value="1,1">Year 2 Term 2</option>
                <option value="1,2">Year 2 Term 3</option>
                <option value="2,0">Year 3 Term 1</option>
                <option value="2,1">Year 3 Term 2</option>
                <option value="2,2">Year 3 Term 3</option>
                <option value="3,0">Year 4 Term 1</option>
                <option value="3,1">Year 4 Term 2</option>
                <option value="3,2">Year 4 Term 3</option>
              </optgroup>
            </select>
          </div>
        ) : (
          <div className="variant-b-term-row">
            <div className="formGroup term-inline-group">
              <label htmlFor="move-year-select-b">Target Year:</label>
              <select
                id="move-year-select-b"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                <option value={0}>Year 1</option>
                <option value={1}>Year 2</option>
                <option value={2}>Year 3</option>
                <option value={3}>Year 4</option>
              </select>
            </div>
            <div className="formGroup term-inline-group">
              <label htmlFor="move-term-select-b">Target Term:</label>
              <select
                id="move-term-select-b"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(Number(e.target.value))}
              >
                <option value={0}>Term 1</option>
                <option value={1}>Term 2</option>
                <option value={2}>Term 3</option>
              </select>
            </div>
          </div>
        )}
        <div className="formGroup">
          <button type="submit" className="btn-submit">
            Move Course
          </button>
        </div>
      </form>

      <hr className="dialogDivider" />

      {/* Danger Zone */}
      <div className="dialogDangerZone">
        {!isConfirmingDelete ? (
          <button
            type="button"
            className="btn-danger"
            onClick={handleRemoveClick}
          >
            Remove Course from Schedule
          </button>
        ) : (
          <div className="deleteConfirmBox">
            <p className="deleteConfirmWarning">
              Are you sure you want to remove <strong>{course.code}</strong> from your schedule?
            </p>
            <div className="deleteConfirmButtons">
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={() => {
                  onRemove(course.code);
                  onClose();
                }}
              >
                Yes, Remove Course
              </button>
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="formGroup buttons">
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>

      {/* Interstitial Modal for Variant B */}
      {interstitialModal && (
        <DownstreamConflictModal
          course={course}
          actionType={interstitialModal.type}
          affectedCourses={interstitialModal.simulation.affectedCourses}
          onConfirm={handleConfirmInterstitial}
          onCancel={() => setInterstitialModal(null)}
        />
      )}
    </div>
  );
}

/**
 * Dedicated Interstitial Modal for Variant B
 */
function DownstreamConflictModal({
  course,
  actionType,
  affectedCourses,
  onConfirm,
  onCancel
}) {
  const isMove = actionType === 'move';

  return (
    <div className="dialogOverlay interstitial-overlay" role="dialog" aria-modal="true">
      <div className="dialogWrapper interstitial-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="interstitial-header">
          <span className="interstitial-warning-badge">⚠️ WARNING</span>
          <h2>Downstream Prerequisite Conflict</h2>
        </div>

        <p className="interstitial-desc">
          {isMove ? (
            <>
              Moving <strong>{course.code}</strong> will break prerequisites for{' '}
              <strong>{affectedCourses.length}</strong> downstream scheduled course(s):
            </>
          ) : (
            <>
              Removing <strong>{course.code}</strong> will break prerequisites for{' '}
              <strong>{affectedCourses.length}</strong> downstream scheduled course(s):
            </>
          )}
        </p>

        <div className="interstitial-affected-box">
          <ul className="interstitial-list">
            {affectedCourses.map((c) => (
              <li key={c.id || c.courseCode} className="interstitial-item">
                <div className="interstitial-item-top">
                  <span className="interstitial-code">{c.courseCode}</span>
                  <span className="interstitial-loc">{c.locationLabel}</span>
                </div>
                <div className="interstitial-item-reason">
                  {c.reason}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="interstitial-reassurance-card">
          <span className="reassurance-icon">ℹ️</span>
          <div className="reassurance-text">
            <strong>Non-destructive scheduling:</strong> Downstream courses will{' '}
            <strong>NOT</strong> be deleted. They will remain on your schedule and will be tagged with{' '}
            <span className="pill-sample">⚠️ Missing Req</span> flags.
          </div>
        </div>

        <div className="interstitial-actions">
          <button
            type="button"
            className="btn-interstitial-cancel"
            onClick={onCancel}
          >
            Cancel & Keep Safe
          </button>
          <button
            type="button"
            className="btn-interstitial-confirm"
            onClick={onConfirm}
          >
            {isMove ? 'Confirm Move & Flag Downstream' : 'Confirm Removal & Flag Downstream'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VARIANT C: Tabbed Console with Live Impact Timeline & Waiver Memo
// ============================================================================
export function ManageCourseVariantC({
  course,
  schedule,
  catalogCourses = [],
  onClose,
  onRemove,
  onMove,
  onUpdate,
  onToggleWaiver,
  courseValidation
}) {
  const isTransfer = Boolean(course?.isTransfer);
  const initialLocation = course?.currentTerm ? formatLocationKey(course.currentTerm) : '0,0';
  const [targetLocation, setTargetLocation] = useState(initialLocation);
  const parsedCurrent = parseLocation(course?.currentTerm);
  const [selectedYear, setSelectedYear] = useState(parsedCurrent.type === 'term' ? parsedCurrent.year : 0);
  const [selectedTerm, setSelectedTerm] = useState(parsedCurrent.type === 'term' ? parsedCurrent.term : 0);

  // Tab state: 'schedule' or 'requirements'
  const [activeTab, setActiveTab] = useState('schedule');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [impactAck, setImpactAck] = useState(false);
  const [waiverMemo, setWaiverMemo] = useState(course?.waiverMemo || '');
  const [memoSaved, setMemoSaved] = useState(false);

  const effectiveTarget = isTransfer
    ? (targetLocation === 'transfer' ? 'transfer' : targetLocation.split(',').map(Number))
    : [selectedYear, selectedTerm];

  // Live downstream simulation for move
  const moveSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'move', effectiveTarget, catalogCourses);
  }, [schedule, course?.code, effectiveTarget, catalogCourses]);

  const removeSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'remove', null, catalogCourses);
  }, [schedule, course?.code, catalogCourses]);

  const catCourse = catalogCourses.find(c => c.code === course?.code) || course;
  const isSatisfied = courseValidation?.overallStatus === 'SATISFIED';
  const isWaived = Boolean(course?.isWaived || courseValidation?.isWaived);
  const isUnsatisfied = !isSatisfied && !isWaived;

  const handleMoveSubmit = (e) => {
    e.preventDefault();
    if (moveSimulation.hasDownstreamImpact && !impactAck) return;
    onMove(effectiveTarget, course.code);
    onClose();
  };

  const handleSaveMemo = (e) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate({ ...course, waiverMemo });
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    }
  };

  return (
    <div className="manage-variant-c">
      {/* Tab Navigation Header */}
      <div className="variant-c-tab-nav">
        <button
          type="button"
          className={`variant-c-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          ⚙️ Manage & Move
          {moveSimulation.hasDownstreamImpact && <span className="tab-alert-dot" title="Downstream impact detected">•</span>}
        </button>
        <button
          type="button"
          className={`variant-c-tab-btn ${activeTab === 'requirements' ? 'active' : ''}`}
          onClick={() => setActiveTab('requirements')}
        >
          📋 Requirements & Waivers
          {isUnsatisfied && <span className="tab-alert-badge">Incomplete</span>}
          {isWaived && <span className="tab-waived-badge">Waived</span>}
        </button>
      </div>

      {activeTab === 'schedule' && (
        <div className="variant-c-tab-pane">
          <div className="dialogCourseInfo">
            <div className="dialogCourseTitleRow">
              <p className="dialogCourseName">
                <strong>{course.code}:</strong> {course.name}
              </p>
              {isTransfer && <span className="transferBadge">Transfer</span>}
            </div>
            <p className="dialogCourseCredits">
              <strong>Credits:</strong> {course.credits} • <strong>Location:</strong> {formatCurrentLocation(course.currentTerm)}
            </p>
            {isTransfer && (
              <>
                <p className="dialogCourseInstitution">
                  <strong>Institution:</strong> {course.institution || "None"}
                </p>
                <p className="dialogCourseSatisfies">
                  <strong>Satisfies:</strong> {course.satisfiesCourse || "None / General Elective"}
                </p>
              </>
            )}
            <p className="dialogCourseDescription">
              <strong>Description:</strong> {course.description || "None"}
            </p>
          </div>

          <form onSubmit={handleMoveSubmit} className="variant-c-form">
            <h3 className="dialogSubheading">Change Schedule Location</h3>
            {isTransfer ? (
              <div className="formGroup">
                <label htmlFor="move-location-select-c">Target Location:</label>
                <select
                  id="move-location-select-c"
                  value={targetLocation}
                  onChange={(e) => {
                    setTargetLocation(e.target.value);
                    setImpactAck(false);
                  }}
                >
                  <option value="transfer">Pre-College / Transfer Credits</option>
                  <optgroup label="Academic Years">
                    <option value="0,0">Year 1 Term 1</option>
                    <option value="0,1">Year 1 Term 2</option>
                    <option value="0,2">Year 1 Term 3</option>
                    <option value="1,0">Year 2 Term 1</option>
                    <option value="1,1">Year 2 Term 2</option>
                    <option value="1,2">Year 2 Term 3</option>
                    <option value="2,0">Year 3 Term 1</option>
                    <option value="2,1">Year 3 Term 2</option>
                    <option value="2,2">Year 3 Term 3</option>
                    <option value="3,0">Year 4 Term 1</option>
                    <option value="3,1">Year 4 Term 2</option>
                    <option value="3,2">Year 4 Term 3</option>
                  </optgroup>
                </select>
              </div>
            ) : (
              <div className="variant-b-term-row">
                <div className="formGroup term-inline-group">
                  <label htmlFor="move-year-select-c">Target Year:</label>
                  <select
                    id="move-year-select-c"
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(Number(e.target.value));
                      setImpactAck(false);
                    }}
                  >
                    <option value={0}>Year 1</option>
                    <option value={1}>Year 2</option>
                    <option value={2}>Year 3</option>
                    <option value={3}>Year 4</option>
                  </select>
                </div>
                <div className="formGroup term-inline-group">
                  <label htmlFor="move-term-select-c">Target Term:</label>
                  <select
                    id="move-term-select-c"
                    value={selectedTerm}
                    onChange={(e) => {
                      setSelectedTerm(Number(e.target.value));
                      setImpactAck(false);
                    }}
                  >
                    <option value={0}>Term 1</option>
                    <option value={1}>Term 2</option>
                    <option value={2}>Term 3</option>
                  </select>
                </div>
              </div>
            )}

            {/* Real-time Impact Timeline Strip (Variant C) */}
            <div className={`variant-c-impact-strip ${moveSimulation.hasDownstreamImpact ? 'has-impact' : 'clean'}`}>
              <div className="impact-strip-header">
                <span className="impact-indicator">
                  {moveSimulation.hasDownstreamImpact ? '⚠️' : '🟢'}
                </span>
                <strong>
                  {moveSimulation.hasDownstreamImpact
                    ? `Schedule Impact: ${moveSimulation.affectedCourses.length} Downstream Course(s) Broken`
                    : 'Safe Mutation: No downstream courses affected'}
                </strong>
              </div>

              {moveSimulation.hasDownstreamImpact && (
                <div className="variant-c-timeline-preview">
                  <div className="timeline-flow">
                    <span className="flow-step current">{formatCurrentLocation(course.currentTerm)}</span>
                    <span className="flow-arrow">➔</span>
                    <span className="flow-step target">
                      {isTransfer ? targetLocation : `Year ${selectedYear + 1}, Term ${selectedTerm + 1}`}
                    </span>
                  </div>
                  <div className="timeline-affected">
                    {moveSimulation.affectedCourses.map((c) => (
                      <div key={c.id || c.courseCode} className="timeline-item">
                        <span className="timeline-badge">Breaks</span>
                        <strong>{c.courseCode}</strong> in {c.locationLabel}
                      </div>
                    ))}
                  </div>
                  <label className="variant-c-ack">
                    <input
                      type="checkbox"
                      checked={impactAck}
                      onChange={(e) => setImpactAck(e.target.checked)}
                    />
                    <span>Allow downstream prerequisite flags</span>
                  </label>
                </div>
              )}
            </div>

            <div className="formGroup">
              <button
                type="submit"
                className={`btn-submit ${moveSimulation.hasDownstreamImpact && !impactAck ? 'btn-disabled' : ''}`}
                disabled={moveSimulation.hasDownstreamImpact && !impactAck}
              >
                Apply Location Change
              </button>
            </div>
          </form>

          <hr className="dialogDivider" />

          {/* Danger Zone */}
          <div className="dialogDangerZone">
            {!isConfirmingDelete ? (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Remove Course from Schedule
              </button>
            ) : (
              <div className="deleteConfirmBox">
                <p className="deleteConfirmWarning">
                  Remove <strong>{course.code}</strong> from schedule?
                </p>
                {removeSimulation.hasDownstreamImpact && (
                  <p className="variant-c-remove-impact">
                    ⚠️ Will invalidate requirements for: {removeSimulation.affectedCourses.map(c => c.courseCode).join(', ')}.
                  </p>
                )}
                <div className="deleteConfirmButtons">
                  <button
                    type="button"
                    className="btn-confirm-delete"
                    onClick={() => {
                      onRemove(course.code);
                      onClose();
                    }}
                  >
                    Confirm Removal
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-delete"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="variant-c-tab-pane">
          <div className="variant-c-req-overview">
            <h4>Prerequisite & Corequisite Diagnostics</h4>
            <div className="variant-c-status-row">
              <span>Overall Status:</span>
              {isSatisfied && <span className="audit-badge badge-satisfied">Satisfied</span>}
              {isWaived && <span className="audit-badge badge-waived">Waived</span>}
              {isUnsatisfied && <span className="audit-badge badge-unsatisfied">Incomplete</span>}
            </div>
          </div>

          <div className="variant-c-rules-list">
            <h5>Required Coursework:</h5>
            {(!catCourse.prerequisites || catCourse.prerequisites.length === 0) &&
             (!catCourse.corequisites || catCourse.corequisites.length === 0) ? (
              <p className="audit-none-text">None required.</p>
            ) : (
              <ul>
                {courseValidation?.prereqResult?.options?.map((opt, i) => (
                  <li key={`c-prereq-${i}`} className={`rule-chip ${opt.isSatisfied ? 'met' : 'missing'}`}>
                    <span>{opt.isSatisfied ? '✓' : '✗'}</span>
                    <strong>{opt.required.join(' OR ')}</strong>
                    <span className="rule-note">{opt.isSatisfied ? 'Completed' : 'Missing'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <hr className="dialogDivider" />

          {/* Advisor Waiver Console */}
          <div className="variant-c-waiver-console">
            <h4>Advisor Waiver Management</h4>
            {isSatisfied ? (
              <div className="waiver-not-needed-note">
                <span className="icon">✓</span>
                <span>Requirements are fully fulfilled. No waiver override is required.</span>
              </div>
            ) : (
              <>
                <div className="waiver-toggle-row">
                  <label className="variant-c-toggle-label">
                    <input
                      type="checkbox"
                      checked={isWaived}
                      onChange={() => onToggleWaiver && onToggleWaiver(course.code)}
                    />
                    <strong>Requirement Waiver Active</strong>
                  </label>
                  <span className="toggle-explanation">
                    {isWaived ? 'Course is waived and marked on schedule.' : 'Check to grant advisor exception.'}
                  </span>
                </div>

                {isWaived && (
                  <form onSubmit={handleSaveMemo} className="waiver-memo-form">
                    <label htmlFor="waiver-memo-input">Advisor Memo / Reason (Optional):</label>
                    <input
                      id="waiver-memo-input"
                      type="text"
                      placeholder="e.g. AP waiver or department approval"
                      value={waiverMemo}
                      onChange={(e) => setWaiverMemo(e.target.value)}
                    />
                    <div className="memo-btn-row">
                      <button type="submit" className="btn-save-memo">
                        {memoSaved ? 'Saved ✓' : 'Save Memo'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="formGroup buttons">
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// VARIANT D: Hybrid (Inline Requirement Status from A + Live Downstream Timeline from C)
// ============================================================================
export function ManageCourseVariantD({
  course,
  schedule,
  catalogCourses = [],
  onClose,
  onRemove,
  onMove,
  onUpdate,
  onToggleWaiver,
  courseValidation
}) {
  const isTransfer = Boolean(course?.isTransfer);
  const initialLocation = course?.currentTerm ? formatLocationKey(course.currentTerm) : '0,0';
  const [targetLocation, setTargetLocation] = useState(initialLocation);
  const parsedCurrent = parseLocation(course?.currentTerm);
  const [selectedYear, setSelectedYear] = useState(parsedCurrent.type === 'term' ? parsedCurrent.year : 0);
  const [selectedTerm, setSelectedTerm] = useState(parsedCurrent.type === 'term' ? parsedCurrent.term : 0);

  // Acknowledgment for downstream impact
  const [impactAck, setImpactAck] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const effectiveTarget = isTransfer
    ? (targetLocation === 'transfer' ? 'transfer' : targetLocation.split(',').map(Number))
    : [selectedYear, selectedTerm];

  // Live downstream simulation for move
  const moveSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'move', effectiveTarget, catalogCourses);
  }, [schedule, course?.code, effectiveTarget, catalogCourses]);

  // Live downstream simulation for remove
  const removeSimulation = useMemo(() => {
    return simulateScheduleMutation(schedule, course?.code, 'remove', null, catalogCourses);
  }, [schedule, course?.code, catalogCourses]);

  const isSatisfied = courseValidation?.overallStatus === 'SATISFIED';
  const isWaived = Boolean(course?.isWaived || courseValidation?.isWaived);
  const isUnsatisfied = !isSatisfied && !isWaived;

  const handleMoveSubmit = (e) => {
    e.preventDefault();
    if (moveSimulation.hasDownstreamImpact && !impactAck) return;
    onMove(effectiveTarget, course.code);
    onClose();
  };

  const handleConfirmRemove = () => {
    onRemove(course.code);
    onClose();
  };

  return (
    <div className="manage-variant-d">
      {/* Course Header Info */}
      <div className="dialogCourseInfo">
        <div className="dialogCourseTitleRow">
          <p className="dialogCourseName">
            <strong>{course.code}:</strong> {course.name}
          </p>
          {isTransfer && <span className="transferBadge">Transfer</span>}
        </div>
        <p className="dialogCourseCredits">
          <strong>Credits:</strong> {course.credits}
        </p>
        <p className="dialogCourseCurrentTerm">
          <strong>Current Location:</strong> {formatCurrentLocation(course.currentTerm)}
        </p>
        {isTransfer && (
          <>
            <p className="dialogCourseInstitution">
              <strong>Institution:</strong> {course.institution || "None"}
            </p>
            <p className="dialogCourseSatisfies">
              <strong>Satisfies:</strong> {course.satisfiesCourse || "None / General Elective"}
            </p>
          </>
        )}
        <p className="dialogCourseDescription">
          <strong>Description:</strong> {course.description || "None"}
        </p>
      </div>

      {/* Prerequisite Status Strip (from Variant A) */}
      <div className="variant-a-requirement-strip">
        <div className="variant-a-req-header">
          <span className="variant-a-req-title">Prerequisite Status:</span>
          {isSatisfied && (
            <span className="audit-badge badge-satisfied">✅ Requirements Met</span>
          )}
          {isWaived && (
            <span className="audit-badge badge-waived">🏷️ Waived by Override</span>
          )}
          {isUnsatisfied && (
            <span className="audit-badge badge-unsatisfied">⚠️ Requirements Incomplete</span>
          )}
        </div>

        {/* Missing rule description */}
        {isUnsatisfied && courseValidation?.missingSummary && (
          <p className="variant-a-missing-desc">
            Missing: <strong>{courseValidation.missingSummary}</strong>
          </p>
        )}

        {/* Waiver Toggle: Only available if not already satisfied */}
        {!isSatisfied && (
          <div className="variant-a-waiver-container">
            <label className="waiver-checkbox-label">
              <input
                type="checkbox"
                checked={isWaived}
                onChange={() => onToggleWaiver && onToggleWaiver(course.code)}
              />
              <span>Advisor Requirement Waiver</span>
            </label>
            <span className="waiver-caption">
              {isWaived 
                ? "Waiver granted. Click to revoke waiver and reinstate requirement checks."
                : "Override prerequisite checks and permit out-of-sequence completion."}
            </span>
          </div>
        )}
      </div>

      <hr className="dialogDivider" />

      {/* Move Course Form */}
      <form onSubmit={handleMoveSubmit} className="variant-d-move-form">
        <h3 className="dialogSubheading">Move Course</h3>
        {isTransfer ? (
          <div className="formGroup">
            <label htmlFor="move-location-select-d">Target Location:</label>
            <select
              id="move-location-select-d"
              value={targetLocation}
              onChange={(e) => {
                setTargetLocation(e.target.value);
                setImpactAck(false);
              }}
            >
              <option value="transfer">Pre-College / Transfer Credits</option>
              <optgroup label="Academic Years">
                <option value="0,0">Year 1 Term 1</option>
                <option value="0,1">Year 1 Term 2</option>
                <option value="0,2">Year 1 Term 3</option>
                <option value="1,0">Year 2 Term 1</option>
                <option value="1,1">Year 2 Term 2</option>
                <option value="1,2">Year 2 Term 3</option>
                <option value="2,0">Year 3 Term 1</option>
                <option value="2,1">Year 3 Term 2</option>
                <option value="2,2">Year 3 Term 3</option>
                <option value="3,0">Year 4 Term 1</option>
                <option value="3,1">Year 4 Term 2</option>
                <option value="3,2">Year 4 Term 3</option>
              </optgroup>
            </select>
          </div>
        ) : (
          <div className="variant-b-term-row">
            <div className="formGroup term-inline-group">
              <label htmlFor="move-year-select-d">Target Year:</label>
              <select
                id="move-year-select-d"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setImpactAck(false);
                }}
              >
                <option value={0}>Year 1</option>
                <option value={1}>Year 2</option>
                <option value={2}>Year 3</option>
                <option value={3}>Year 4</option>
              </select>
            </div>
            <div className="formGroup term-inline-group">
              <label htmlFor="move-term-select-d">Target Term:</label>
              <select
                id="move-term-select-d"
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(Number(e.target.value));
                  setImpactAck(false);
                }}
              >
                <option value={0}>Term 1</option>
                <option value={1}>Term 2</option>
                <option value={2}>Term 3</option>
              </select>
            </div>
          </div>
        )}

        {/* Real-time Schedule Impact Timeline Strip (from Variant C) */}
        <div className={`variant-c-impact-strip ${moveSimulation.hasDownstreamImpact ? 'has-impact' : 'clean'}`}>
          <div className="impact-strip-header">
            <span className="impact-indicator">
              {moveSimulation.hasDownstreamImpact ? '⚠️' : '🟢'}
            </span>
            <strong>
              {moveSimulation.hasDownstreamImpact
                ? `Schedule Impact: ${moveSimulation.affectedCourses.length} Downstream Course(s) Broken`
                : 'Safe Mutation: No downstream courses affected'}
            </strong>
          </div>

          {moveSimulation.hasDownstreamImpact && (
            <div className="variant-c-timeline-preview">
              <div className="timeline-flow">
                <span className="flow-step current">{formatCurrentLocation(course.currentTerm)}</span>
                <span className="flow-arrow">➔</span>
                <span className="flow-step target">
                  {isTransfer ? targetLocation : `Year ${selectedYear + 1}, Term ${selectedTerm + 1}`}
                </span>
              </div>
              <div className="timeline-affected">
                {moveSimulation.affectedCourses.map((c) => (
                  <div key={c.id || c.courseCode} className="timeline-item">
                    <span className="timeline-badge">Breaks</span>
                    <strong>{c.courseCode}</strong> in {c.locationLabel}
                    <span className="timeline-item-reason">({c.reason})</span>
                  </div>
                ))}
              </div>
              <label className="variant-c-ack">
                <input
                  type="checkbox"
                  checked={impactAck}
                  onChange={(e) => setImpactAck(e.target.checked)}
                />
                <span>Allow downstream prerequisite flags</span>
              </label>
            </div>
          )}
        </div>

        <div className="formGroup">
          <button
            type="submit"
            className={`btn-submit ${moveSimulation.hasDownstreamImpact && !impactAck ? 'btn-disabled' : ''}`}
            disabled={moveSimulation.hasDownstreamImpact && !impactAck}
          >
            {moveSimulation.hasDownstreamImpact ? '⚡ Move Course (With Warnings)' : 'Move Course'}
          </button>
        </div>
      </form>

      <hr className="dialogDivider" />

      {/* Danger Zone */}
      <div className="dialogDangerZone">
        {!isConfirmingDelete ? (
          <button
            type="button"
            className="btn-danger"
            onClick={() => setIsConfirmingDelete(true)}
          >
            Remove Course from Schedule
          </button>
        ) : (
          <div className="deleteConfirmBox">
            <p className="deleteConfirmWarning">
              Are you sure you want to remove <strong>{course.code}</strong> from your schedule?
            </p>
            {removeSimulation.hasDownstreamImpact && (
              <div className="variant-a-remove-warning">
                <p className="remove-warning-text">
                  ⚠️ <strong>Notice:</strong> Removing this course invalidates prerequisites for{' '}
                  <strong>{removeSimulation.affectedCourses.length}</strong> downstream course(s):
                </p>
                <ul className="downstream-list compact">
                  {removeSimulation.affectedCourses.map((c) => (
                    <li key={c.id || c.courseCode}>
                      <strong>{c.courseCode}</strong> ({c.locationLabel}) — {c.reason}
                    </li>
                  ))}
                </ul>
                <p className="remove-reassurance">
                  Affected courses will remain on the schedule with ⚠️ Missing Req flags.
                </p>
              </div>
            )}
            <div className="deleteConfirmButtons">
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={handleConfirmRemove}
              >
                Yes, Remove Course
              </button>
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="formGroup buttons">
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
