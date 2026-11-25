import { useEffect } from 'react';

export default function PrototypeSwitcher({ variants, currentVariant, onSelectVariant }) {
  const currentIndex = Math.max(0, variants.findIndex(v => v.key === currentVariant));

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + variants.length) % variants.length;
    onSelectVariant(variants[nextIdx].key);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % variants.length;
    onSelectVariant(variants[nextIdx].key);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, variants]);

  const active = variants[currentIndex] || variants[0];

  return (
    <aside className="prototype-floating-switcher" aria-label="Prototype Variant Switcher">
      <button 
        type="button" 
        className="proto-arrow-btn" 
        onClick={handlePrev} 
        aria-label="Previous Variant"
      >
        ◀
      </button>
      <div className="proto-label-content">
        <span className="proto-tag">PROTOTYPE #21</span>
        <strong className="proto-variant-title">{active.name}</strong>
      </div>
      <button 
        type="button" 
        className="proto-arrow-btn" 
        onClick={handleNext} 
        aria-label="Next Variant"
      >
        ▶
      </button>
    </aside>
  );
}
