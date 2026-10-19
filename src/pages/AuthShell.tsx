import type { ReactNode } from 'react';
import { Logo } from '../components/Logo';

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo tagline />
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
      <p className="auth-note muted">GoalSync is a private space for two people.</p>
    </div>
  );
}
