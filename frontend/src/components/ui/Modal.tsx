import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body> so print CSS (index.css) can hide #root and print only
  // the open modal. The print: classes drop the overlay chrome and height clip
  // so long receipts flow across pages.
  return createPortal(
    <div
      data-modal-root
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0"
    >
      <div className="absolute inset-0 bg-black/40 print:hidden" onClick={onClose} />
      <div
        className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col print:max-w-none print:max-h-none print:shadow-none print:rounded-none print:block`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 print:overflow-visible print:p-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
