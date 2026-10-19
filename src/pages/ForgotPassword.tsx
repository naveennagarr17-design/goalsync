import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a link to choose a new one." footer={<Link to="/login">Back to log in</Link>}>
      {sent ? (
        <div className="notice">
          <MailCheck size={22} aria-hidden />
          <p>If <strong>{email.trim()}</strong> belongs to a member, a reset link is on its way. It may take a minute.</p>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}
