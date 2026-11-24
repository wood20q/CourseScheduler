import { useState } from 'react';

/**
 * Variant A: Inline Status Pill with Floating Hover Popover
 * Lightweight, non-intrusive badge next to title that reveals full diagnostics on hover.
 */
export function VariantAFlag({ validation }) {
  const [isHovered, setIsHovered] = useState(false);
  if (!validation || !validation.hasFlag) return null;

  const isWaived = validation.overallStatus === 'WAIVED';

  return (
    <div 
      className="req-flag-container-a"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={`req-badge-pill ${isWaived ? 'waived' : 'unsatisfied'}`}>
        {isWaived ? '🏷️ Waived' : '⚠️ Missing Req'}
      </span>
      {isHovered && (
        <div className="req-popover-a">
          <div className="req-popover-header">
            {isWaived ? 'Requirement Waived' : 'Unsatisfied Prerequisite / Corequisite'}
          </div>
          <div className="req-popover-body">
            <p><strong>Status:</strong> {validation.missingSummary}</p>
            <p className="req-popover-hint">
              {isWaived 
                ? 'Course has an approved waiver on this schedule.' 
                : 'Prerequisites must be completed in an earlier term or satisfied via transfer credits.'}
            </p>
          </div>
        </div>
      )}
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

  return (
    <div className="req-flag-container-b" onClick={(e) => e.stopPropagation()}>
      <div className={`req-banner-b ${isWaived ? 'waived' : 'unsatisfied'}`}>
        <span>{isWaived ? '🏷️ Requirement Waived' : '⚠️ Unsatisfied Requirements'}</span>
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
          <p className="drawer-summary"><strong>Missing:</strong> {validation.missingSummary}</p>
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

  return (
    <div className="req-flag-container-c" onClick={(e) => e.stopPropagation()}>
      <button 
        type="button" 
        className={`req-action-chip-c ${isWaived ? 'waived' : 'unsatisfied'}`}
        onClick={() => onInspect && onInspect(course, validation)}
        title="Click to view detailed requirement audit and resolution options"
      >
        {isWaived ? '🏷️ Waived' : '⚠️ Missing Requirements'}
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
          <div className={`inspector-status-badge ${isWaived ? 'waived' : 'unsatisfied'}`}>
            {isWaived ? 'WAIVED (Permitted on Schedule)' : 'UNSATISFIED (Prerequisites or Corequisites Missing)'}
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
          {onToggleWaiver && (
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
