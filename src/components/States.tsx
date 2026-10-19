import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={22} aria-hidden />
      <p>{message}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="state empty">
      {icon && <div className="empty-icon" aria-hidden>{icon}</div>}
      <p className="empty-title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  );
}
