import { useState } from 'react';

/**
 * Variant A: Rounded Status Pill with Inspector Modal Dialog
 * Clean rounded pill badge from Prototype A that directly triggers the
 * accessible Requirement Inspector Modal from Prototype C upon click.
 * Designed to fit seamlessly on a single-line compact course card.
 */
export function VariantAFlag({ validation, course, onInspect }) {
  if (!validation || !validation.hasFlag) return null;

  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let badgeClass = 'unsatisfied';
  let badgeLabel = '⚠️ Missing Req';

  if (isWaived) {
    badgeClass = 'waived';
    badgeLabel = '🏷️ Waived';
  } else if (isSatisfied) {
    badgeClass = 'satisfied';
    badgeLabel = '✓ Req Met';
  }

  const tooltipText = isWaived 
    ? 'Requirement Waived by override — Click to inspect audit details' 
    : isSatisfied
      ? 'All prerequisite and corequisite requirements are satisfied — Click to view details'
      : `Missing: ${validation.missingSummary} — Click to inspect requirements and waiver options`;

  return (
    <div className="req-flag-container-a" onClick={(e) => e.stopPropagation()}>
      <button 
        type="button"
        className={`req-badge-pill clickable ${badgeClass}`}
        title={tooltipText}
        onClick={(e) => {
          e.stopPropagation();
          if (onInspect) onInspect(course, validation);
        }}
        aria-label={`${badgeLabel}: Click to inspect requirement details`}
      >
        {badgeLabel}
      </button>
    </div>
  );
}

/**
 * Variant B: Full Card Header Alert Banner & Collapsible Inline Drawer
 * High-visibility banner across the card top with an inline collapsible section embedded on the card.
 */
export function VariantBStrip({ validation }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!validation || !validation.hasFlag) return null;

  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let bannerClass = 'unsatisfied';
  let bannerText = '⚠️ Unsatisfied Requirements';

  if (isWaived) {
    bannerClass = 'waived';
    bannerText = '🏷️ Requirement Waived';
  } else if (isSatisfied) {
    bannerClass = 'satisfied';
    bannerText = '✓ Requirements Met';
  }

  return (
    <div className="req-flag-container-b" onClick={(e) => e.stopPropagation()}>
      <div className={`req-banner-b ${bannerClass}`}>
        <span>{bannerText}</span>
        <button 
          type="button" 
          className="btn-drawer-toggle-b"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Hide ▲' : 'Details ▼'}
        </button>
      </div>
      {isOpen && (
        <div className="req-drawer-b">
          <p className="drawer-summary"><strong>Summary:</strong> {validation.missingSummary}</p>
          <div className="drawer-rules">
            <span>• Prereqs: earlier term required</span>
            <span>• Coreqs: concurrent or earlier term</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Variant C: Header Action Chip & Contextual Requirement Inspector Modal
 * Card displays an interactive alert chip that opens a dedicated modal/drawer inspector.
 */
export function VariantCChip({ validation, onInspect, course }) {
  if (!validation || !validation.hasFlag) return null;

  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let chipClass = 'unsatisfied';
  let chipText = '⚠️ Missing Requirements';

  if (isWaived) {
    chipClass = 'waived';
    chipText = '🏷️ Waived';
  } else if (isSatisfied) {
    chipClass = 'satisfied';
    chipText = '✓ Requirements';
  }

  return (
    <div className="req-flag-container-c" onClick={(e) => e.stopPropagation()}>
      <button 
        type="button" 
        className={`req-action-chip-c ${chipClass}`}
        onClick={() => onInspect && onInspect(course, validation)}
        title="Click to view detailed requirement audit and resolution options"
      >
        {chipText}
      </button>
    </div>
  );
}

/**
 * Modal Inspector for Variant C
 */
export function RequirementInspectorModal({ course, validation, onClose, onToggleWaiver }) {
  if (!course || !validation) return null;
  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let statusBadgeClass = 'unsatisfied';
  let statusBadgeText = 'UNSATISFIED (Prerequisites or Corequisites Missing)';

  if (isWaived) {
    statusBadgeClass = 'waived';
    statusBadgeText = 'WAIVED (Permitted on Schedule by Override)';
  } else if (isSatisfied) {
    statusBadgeClass = 'satisfied';
    statusBadgeText = 'SATISFIED (All Requirements Fulfilled)';
  }

  return (
    <div className="dialogOverlay" onClick={onClose}>
      <div className="dialogWrapper req-inspector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dialogHeaderRow">
          <h2>Requirement Audit</h2>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>
        <p className="dialogCourseName">
          <strong>{course.code}:</strong> {course.name}
        </p>

        <div className="inspector-status-card">
          <div className="inspector-status-title">Current Evaluation Status:</div>
          <div className={`inspector-status-badge ${statusBadgeClass}`}>
            {statusBadgeText}
          </div>
          <p className="inspector-missing-text">
            <strong>Diagnostic:</strong> {validation.missingSummary}
          </p>
        </div>

        <div className="inspector-sections">
          <div className="inspector-section">
            <h3>Prerequisites</h3>
            <p className="inspector-desc">Must be completed in a strictly prior term or transfer credit.</p>
            <div className="inspector-value">
              {validation.prereqResult?.missingSummary || 'None required'}
            </div>
          </div>
          <div className="inspector-section">
            <h3>Corequisites</h3>
            <p className="inspector-desc">May be taken concurrently in the same term or completed earlier.</p>
            <div className="inspector-value">
              {validation.coreqResult?.missingSummary || 'None required'}
            </div>
          </div>
        </div>

        <div className="formGroup buttons" style={{ marginTop: '1.5em' }}>
          <button type="button" className="btn-close" onClick={onClose}>Done</button>
          {!isSatisfied && onToggleWaiver && (
            <button 
              type="button" 
              className={`btn-submit ${isWaived ? 'btn-revoke-waiver' : 'btn-apply-waiver'}`}
              onClick={() => {
                onToggleWaiver(course.code);
                onClose();
              }}
            >
              {isWaived ? 'Revoke Requirement Waiver' : 'Waive Requirements for this Course'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
