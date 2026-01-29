import { Inbox, Plus } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  description = 'Get started by creating your first item.',
  action,
  actionLabel = 'Create new',
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-200/50 to-cyan-200/50 dark:from-brand-800/30 dark:to-cyan-800/30 blur-2xl" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-lg">
          <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      
      {(action || onAction) && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 btn-primary"
        >
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
