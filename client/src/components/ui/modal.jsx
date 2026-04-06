import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

function Modal({ open, onClose, title, children, className }) {
  const overlayRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      onClose?.();
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl animate-in zoom-in-95 fade-in',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 pb-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export { Modal };
