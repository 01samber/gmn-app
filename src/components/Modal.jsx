import { useEffect, useRef } from "react";

export default function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  size = "md", // sm | md | lg | xl
}) {
  const panelRef = useRef(null);

  // 🔒 Lock body scroll + ESC handling
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // 🎯 Autofocus modal panel
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal overlay"
        type="button"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={[
            "w-full overflow-hidden rounded-2xl",
            "bg-white dark:bg-slate-900",
            "shadow-2xl ring-1 ring-black/5 dark:ring-white/10",
            "focus:outline-none",
            sizes[size] || sizes.md,
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div className="min-w-0">
              <div
                id="modal-title"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate"
              >
                {title}
              </div>

              {subtitle ? (
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="btn-ghost px-3 py-2 text-sm"
              type="button"
            >
              Close
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
