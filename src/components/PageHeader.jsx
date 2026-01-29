import { Sparkles } from "lucide-react";

export default function PageHeader({ title, subtitle, actions, sticky = false, compact = false, icon: Icon }) {
  return (
    <div
      className={[
        "animate-fade-in",
        sticky ? "sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/50 shadow-sm" : "",
      ].join(" ")}
    >
      <div className={["flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", compact ? "sm:items-center" : ""].join(" ")}>
        <div className="min-w-0 flex items-start gap-4">
          {Icon && (
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/10 to-cyan-500/10 dark:from-brand-500/20 dark:to-cyan-500/20 ring-1 ring-brand-200/50 dark:ring-brand-700/30">
              <Icon size={28} className="text-brand-600 dark:text-brand-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              <Sparkles size={20} className="text-brand-500/60 hidden sm:block" />
            </div>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center justify-start sm:justify-end gap-3">{actions}</div>}
      </div>
    </div>
  );
}
