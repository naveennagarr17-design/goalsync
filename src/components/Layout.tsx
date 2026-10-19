import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, History, LayoutDashboard, LogOut, Monitor, Moon, Plus, Settings, Sun, Users } from 'lucide-react';
import { Logo, LogoMark } from './Logo';
import { Loading } from './States';
import { TaskModalProvider, useTaskModal } from './TaskModal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { formatLong } from '../lib/dates';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/history', label: 'Past History', short: 'History', icon: History, end: false },
  { to: '/analytics', label: 'Analytics', short: 'Charts', icon: BarChart3, end: false },
  { to: '/friend', label: 'Friend’s View', short: 'Friend', icon: Users, end: false },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings, end: false },
];

function ThemeToggle() {
  const { mode, cycleMode } = useTheme();
  const next = mode === 'light' ? 'Dark' : mode === 'dark' ? 'System' : 'Light';
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const name = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';
  return (
    <button className="icon-btn outlined" onClick={cycleMode} aria-label={`Appearance: ${name} mode. Switch to ${next}.`} title={`${name} mode`}>
      <Icon size={19} aria-hidden />
    </button>
  );
}

function Shell() {
  const { profile, signOut } = useAuth();
  const { today } = useData();
  const { openAdd } = useTaskModal();
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to content</a>

      <aside className="sidebar">
        <Logo tagline />
        <nav aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={19} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <span className="avatar" aria-hidden>{profile?.display_name.slice(0, 1).toUpperCase()}</span>
            <span className="me-name">{profile?.display_name}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}><LogOut size={16} aria-hidden /> Sign out</button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="mobile-logo"><LogoMark size={30} /></span>
            <div>
              <h1>{current?.label ?? 'GoalSync'}</h1>
              <p className="muted">{formatLong(today)}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="btn btn-primary hide-mobile" onClick={() => openAdd()}><Plus size={18} aria-hidden /> Add task</button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <button className="fab" onClick={() => openAdd()} aria-label="Add task"><Plus size={26} aria-hidden /></button>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-link${isActive ? ' active' : ''}`}>
            <Icon size={22} aria-hidden />
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Layout() {
  return (
    <TaskModalProvider>
      <Shell />
    </TaskModalProvider>
  );
}
