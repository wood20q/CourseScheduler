export default function RequirementInspectorModal({ course, validation, onClose, onToggleWaiver }) {
  if (!course || !validation) return null;
  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let statusBadgeClass = 'unsatisfied';
  let statusBadgeText = 'UNSATISFIED (Prerequisites or Corequisites Missing)';

  if (isWaived) {
    statusBadgeClass = 'waived';
    statusBadgeText = 'WAIVED (Permitted on Schedule by Advisor Waiver)';
  } else if (isSatisfied) {
    statusBadgeClass = 'satisfied';
    statusBadgeText = 'SATISFIED (All Requirements Fulfilled)';
  }

  return (
    <div className="dialogOverlay" onClick={onClose} role="dialog" aria-modal="true">
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
