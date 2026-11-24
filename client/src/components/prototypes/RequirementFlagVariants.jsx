import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Variant A: Inline Status Pill with Floating Portal Popover
 * Rendered via createPortal to body to ensure it NEVER clips against term/schedule overflow.
 * Supports instant hover preview and click to pin open.
 */
export function VariantAFlag({ validation }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [coords, setCoords] = useState(null);
  const badgeRef = useRef(null);
  const popoverRef = useRef(null);

  if (!validation || !validation.hasFlag) return null;

  const isWaived = validation.overallStatus === 'WAIVED';
  const isSatisfied = validation.overallStatus === 'SATISFIED';

  let badgeClass = 'unsatisfied';
  let badgeLabel = '⚠️ Missing Req';
  let headerLabel = 'Unsatisfied Prerequisite / Corequisite';

  if (isWaived) {
    badgeClass = 'waived';
    badgeLabel = '🏷️ Waived';
    headerLabel = 'Requirement Waived';
  } else if (isSatisfied) {
    badgeClass = 'satisfied';
    badgeLabel = '✓ Req Met';
    headerLabel = 'Requirements Satisfied';
  }

  const tooltipText = isWaived 
    ? 'Requirement Waived by override' 
    : isSatisfied
      ? 'All prerequisite and corequisite requirements are satisfied.'
      : `Missing requirements: ${validation.missingSummary}`;

  const isOpen = isHovered || isClicked;

  const updateCoords = () => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 12) left = 12;
    if (typeof window !== 'undefined' && left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const openAbove = rect.bottom + 140 > windowHeight && rect.top > 150;
    const top = openAbove ? (rect.top - 8) : (rect.bottom + 8);

    setCoords({ top, left, openAbove });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScrollOrResize = () => updateCoords();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Click outside to unpin
  useEffect(() => {
    if (!isClicked) return;
    const handleOutsideClick = (e) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsClicked(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isClicked]);

  const popoverNode = isOpen && (
    <div 
      ref={popoverRef}
      className={`req-popover-portal req-popover-a ${isClicked ? 'is-pinned is-open' : ''} ${coords?.openAbove ? 'open-above' : 'open-below'}`} 
      style={{
        position: 'fixed',
        top: coords?.openAbove ? 'auto' : `${coords?.top ?? 0}px`,
        bottom: coords?.openAbove ? `${(typeof window !== 'undefined' ? window.innerHeight : 800) - coords.top}px` : 'auto',
        left: `${coords?.left ?? 0}px`,
        width: '280px',
        zIndex: 99999
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="req-popover-header">
        <span>{headerLabel}</span>
        <button 
          type="button" 
          className="btn-popover-close"
          onClick={(e) => {
            e.stopPropagation();
            setIsClicked(false);
            setIsHovered(false);
          }}
          title="Close"
        >
          ✕
        </button>
      </div>
      <div className="req-popover-body">
        <p><strong>Status:</strong> {validation.missingSummary}</p>
        <p className="req-popover-hint">
          {isWaived 
            ? 'Course has an approved requirement waiver on this schedule.' 
            : isSatisfied
              ? 'Prerequisites completed in prior terms or transfer credits.'
              : 'Prerequisites must be completed in an earlier term or satisfied via transfer credits.'}
        </p>
      </div>
    </div>
  );

  return (
    <div 
      ref={badgeRef}
      className={`req-flag-container-a ${isClicked ? 'is-clicked is-open' : ''}`}
      onMouseEnter={() => {
        updateCoords();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        updateCoords();
        setIsClicked(prev => !prev);
      }}
    >
      <span 
        className={`req-badge-pill ${badgeClass}`}
        title={tooltipText}
        tabIndex={0}
        onFocus={() => {
          updateCoords();
          setIsHovered(true);
        }}
        onBlur={() => setIsHovered(false)}
      >
        {badgeLabel}
      </span>
      {typeof document !== 'undefined' && createPortal(popoverNode, document.body)}
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
