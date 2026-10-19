export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="var(--on-accent)" strokeOpacity="0.35" strokeWidth="6" />
      <path d="M23 33l7 7 12-14" fill="none" stroke="var(--on-accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <div className="logo">
      <LogoMark />
      <div>
        <div className="logo-word">GoalSync</div>
        {tagline && <div className="logo-tag">Your Goals. Your Journey. Together.</div>}
      </div>
    </div>
  );
}
