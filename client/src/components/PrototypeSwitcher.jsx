import { useEffect } from 'react';

export const VARIANTS = [
  { key: 'A', name: 'Pill & Popover', desc: 'Inline Pill & Popover' },
  { key: 'B', name: 'Banner & Drawer', desc: 'Header Banner & Drawer' },
  { key: 'C', name: 'Action & Modal', desc: 'Action Chip & Modal' }
];

export function PrototypeSwitcher({ 
  currentVariant = 'A', 
  onSelectVariant, 
  onLoadDemoSchedule,
  flaggedCount = 0
}) {
  const safeKey = String(currentVariant || 'A').toUpperCase();
  const currentIndex = VARIANTS.findIndex(v => v.key === safeKey);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

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
      <div className="switcher-info">
        <span className="switcher-title">Prototype #19:</span>
        <span className="switcher-flag-count">
          {flaggedCount > 0 
            ? `⚠️ ${flaggedCount} Flagged` 
            : '0 Flagged on Schedule'}
        </span>
      </div>

      <div className="switcher-tabs">
        <button 
          type="button" 
          className="switcher-arrow-btn" 
          onClick={handlePrev} 
          title="Previous variant (Left Arrow)"
        >
          ◀
        </button>

        {VARIANTS.map(v => (
          <button
            key={v.key}
            type="button"
            className={`switcher-tab-btn ${v.key === safeKey ? 'active' : ''}`}
            onClick={() => onSelectVariant(v.key)}
            title={`Switch to Variant ${v.key}: ${v.desc}`}
          >
            <span className="tab-pill">Variant {v.key}</span>
            <span className="tab-text">{v.name}</span>
          </button>
        ))}

        <button 
          type="button" 
          className="switcher-arrow-btn" 
          onClick={handleNext} 
          title="Next variant (Right Arrow)"
        >
          ▶
        </button>
      </div>

      {onLoadDemoSchedule && (
        <button 
          type="button" 
          className="switcher-demo-btn" 
          onClick={onLoadDemoSchedule}
          title="Seed schedule with test prerequisite and corequisite cases"
        >
          ⚡ Load Test Courses
        </button>
      )}
    </div>
  );
}

export default PrototypeSwitcher;
