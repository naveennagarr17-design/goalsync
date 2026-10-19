import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import { Loading } from '../components/States';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Choose a password with at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (loading) return <AuthShell title="Choose a new password"><Loading /></AuthShell>;

  if (!session) {
    return (
      <AuthShell title="This link has expired" footer={<Link to="/login">Back to log in</Link>}>
        <p className="muted">Reset links work once and expire after a while.</p>
        <Link className="btn btn-primary btn-block" to="/forgot-password">Send a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="password">New password <span className="muted">(8 or more characters)</span></label>
          <input id="password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthShell>
  );
}
