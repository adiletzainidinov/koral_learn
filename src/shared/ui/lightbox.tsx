'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  onClose: () => void;
}

export function Lightbox({ isOpen, imageSrc, imageAlt, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 size-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        aria-label="Закрыть"
      >
        <X className="size-5" />
      </button>

      {/* image — stop propagation so clicking image itself doesn't close */}
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />
        {imageAlt && (
          <p className="mt-2 text-center text-sm text-white/60 truncate">{imageAlt}</p>
        )}
      </div>
    </div>
  );
}
