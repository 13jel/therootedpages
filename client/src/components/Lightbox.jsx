import { useEffect, useRef } from 'react';

export default function Lightbox({ src, alt, title, description, onClose }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        // Dialogen har bara en knapp, så fokus ska aldrig lämna den
        e.preventDefault();
        closeRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  const image = <img src={src} alt={alt} className="lightbox-image" />;

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Förstorad bild'}
      onClick={() => onClose()}
    >
      <button
        ref={closeRef}
        type="button"
        className="lightbox-close"
        aria-label="Stäng förstoring"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <span aria-hidden="true">×</span>
      </button>

      {title ? (
        <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
          {image}
          <div className="gallery-lightbox-info">
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
        </div>
      ) : (
        image
      )}
    </div>
  );
}