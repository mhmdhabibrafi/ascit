"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Premium modal dialog with:
 * - Escape key to close
 * - Overlay/backdrop click to close
 * - Focus trap (first focusable element receives focus)
 * - Scroll lock on body
 * - Smooth entry animations
 */
export function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-5xl"
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Lock body scroll when modal is open */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  /* Auto-focus first focusable element */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 animate-backdrop-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`max-h-[calc(100vh-4rem)] w-full ${maxWidth} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-modal-in`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id="modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <Button type="button" variant="ghost" className="ml-auto h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600" onClick={onClose} aria-label="Tutup modal">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
