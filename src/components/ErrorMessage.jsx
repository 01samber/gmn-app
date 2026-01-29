import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

export default function ErrorMessage({ 
  error, 
  onRetry, 
  title = 'Something went wrong',
  className = '' 
}) {
  if (!error) return null;

  return (
    <div className={`rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 dark:border-rose-800/50 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-200">{title}</h3>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800/40 transition-colors"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineError({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
      <XCircle size={16} className="flex-shrink-0" />
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-800/30 rounded-lg transition-colors">
          <XCircle size={14} />
        </button>
      )}
    </div>
  );
}
