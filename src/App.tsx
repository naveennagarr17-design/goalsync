import { lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Loading } from './components/States';
import AuthShell from './pages/AuthShell';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import { useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

function FullScreenLoading() {
  return <div className="fullscreen"><Loading label="Loading GoalSync…" /></div>;
}

/** Logged-out pages. Signed-in members are sent to the dashboard. */
function PublicOnly() {
  const { user, loading, passwordRecovery } = useAuth();
  if (loading) return <FullScreenLoading />;
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Everything private. Visitors without a session are sent to the login page. */
function RequireAuth() {
  const { user, loading, profileError, passwordRecovery, signOut } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;
  if (profileError) {
    return (
      <AuthShell title="No access" subtitle={profileError}>
        <p className="muted">Only the two invited members can use GoalSync. If this is a mistake, check that this email is on the member list in Supabase.</p>
        <button className="btn btn-secondary btn-block" onClick={() => void signOut()}>Sign out</button>
      </AuthShell>
    );
  }
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}

// Chart pages load only when opened, so the first screen appears faster on phones.
const Analytics = lazy(() => import('./pages/Analytics'));
const FriendView = lazy(() => import('./pages/FriendView'));

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="history" element={<History />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="friend" element={<FriendView />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
