import { useEffect } from 'react';

export const VARIANTS = [
  { key: 'A', name: 'Inline Pill & Hover Popover' },
  { key: 'B', name: 'Header Banner & Collapsible Drawer' },
  { key: 'C', name: 'Action Chip & Inspector Modal' }
];

export function PrototypeSwitcher({ currentVariant, onSelectVariant, onLoadDemoSchedule }) {
  const currentIndex = VARIANTS.findIndex(v => v.key === currentVariant);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const current = VARIANTS[safeIndex];

  const handlePrev = () => {
    const nextIdx = (safeIndex - 1 + VARIANTS.length) % VARIANTS.length;
    onSelectVariant(VARIANTS[nextIdx].key);
  };

  const handleNext = () => {
    const nextIdx = (safeIndex + 1) % VARIANTS.length;
    onSelectVariant(VARIANTS[nextIdx].key);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex]);

  return (
    <div className="prototype-switcher-bar">
      <div className="switcher-label">Prototype #19: Unsatisfied Requirement Flag UI</div>
      <div className="switcher-controls">
        <button 
          type="button" 
          className="switcher-arrow-btn" 
          onClick={handlePrev} 
          title="Previous variant (Left arrow)"
        >
          ◀
        </button>
        <span className="switcher-current-badge">
          Variant {current.key}: {current.name}
        </span>
        <button 
          type="button" 
          className="switcher-arrow-btn" 
          onClick={handleNext} 
          title="Next variant (Right arrow)"
        >
          ▶
        </button>
      </div>
      {onLoadDemoSchedule && (
        <button 
          type="button" 
          className="switcher-demo-btn" 
          onClick={onLoadDemoSchedule}
          title="Populates schedule with demo prerequisite/corequisite test cases"
        >
          ⚡ Load Test Courses
        </button>
      )}
    </div>
  );
}

export default PrototypeSwitcher;
