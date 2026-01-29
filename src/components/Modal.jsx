import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, subtitle, children, onClose, size = "md" }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) { if (e.key === "Escape") onClose?.(); }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [open, onClose]);

  useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);

  if (!open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          className={[
            "relative w-full overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl",
            "shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/50 ring-1 ring-slate-200/50 dark:ring-slate-700/50",
            "focus:outline-none animate-scale-in",
            sizes[size] || sizes.md,
          ].join(" ")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-500 to-brand-500" />
          
          <div className="relative flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700/50 px-6 py-5 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-800/30">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="group flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-all ui-hover"
              type="button"
            >
              <X size={18} className="transition-transform group-hover:rotate-90" />
            </button>
          </div>

          <div className="relative px-6 py-6 max-h-[70vh] overflow-y-auto gmn-scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}
