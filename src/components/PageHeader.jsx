export default function PageHeader({
  title,
  subtitle,
  actions,
  sticky = false,
  compact = false,
}) {
  return (
    <div
      className={[
        sticky
          ? "sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-slate-50/85 dark:bg-slate-950/75 backdrop-blur border-b border-slate-200 dark:border-slate-800"
          : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
          compact ? "sm:items-center" : "",
        ].join(" ")}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
