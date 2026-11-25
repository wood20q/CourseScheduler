export default function RequirementFlag({ validation, course, onInspect }) {
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
    ? 'Requirement Waived by advisor waiver — Click to inspect audit details' 
    : isSatisfied
      ? 'All prerequisite and corequisite requirements are satisfied — Click to view details'
      : `Missing: ${validation.missingSummary} — Click to inspect requirements and waiver options`;

  return (
    <div className="req-flag-container" onClick={(e) => e.stopPropagation()}>
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
