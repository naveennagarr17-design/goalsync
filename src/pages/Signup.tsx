import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter the name your friend will see.');
    if (name.trim().length > 40) return setError('Keep your name under 40 characters.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Choose a password with at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(email, password, name);
      if (needsConfirmation) setCheckEmail(true);
      // Otherwise the session starts and the app moves to the dashboard by itself.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title="Check your email" footer={<Link to="/login">Back to log in</Link>}>
        <div className="notice">
          <MailCheck size={22} aria-hidden />
          <p>We sent a confirmation link to <strong>{email.trim()}</strong>. Open it, then log in here.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Only the two invited email addresses can sign up."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Display name</label>
          <input id="name" className="input" autoComplete="nickname" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password <span className="muted">(8 or more characters)</span></label>
          <input id="password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
