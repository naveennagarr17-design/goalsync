import { useState, type FormEvent } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { formatMedium } from '../lib/dates';
import { ACCENTS, ACCENT_KEYS } from '../lib/themes';
import type { ThemeMode } from '../lib/types';

const MODES: { value: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, hint: 'Always light' },
  { value: 'dark', label: 'Dark', icon: Moon, hint: 'Always dark' },
  { value: 'system', label: 'System', icon: Monitor, hint: 'Match this device' },
];

export default function Settings() {
  const { user, profile, updateProfile, signOut, sendPasswordReset } = useAuth();
  const { friendship, sendFriendRequest, respondToRequest, disconnect } = useData();
  const { mode, accent, resolved, setMode, setAccent } = useTheme();
  const toast = useToast();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendMsg, setFriendMsg] = useState<string | null>(null);
  const [friendErr, setFriendErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError('Enter a display name.');
    if (trimmed.length > 40) return setNameError('Keep it under 40 characters.');
    setNameError(null);
    setSavingName(true);
    try {
      await updateProfile({ display_name: trimmed });
      toast.show('Name saved');
    } catch (err) {
      setNameError((err as Error).message);
    } finally {
      setSavingName(false);
    }
  }

  async function onSendRequest(e: FormEvent) {
    e.preventDefault();
    setFriendMsg(null);
    setFriendErr(null);
    if (!/^\S+@\S+\.\S+$/.test(friendEmail.trim())) return setFriendErr('Enter your friend’s email address.');
    setBusy(true);
    try {
      await sendFriendRequest(friendEmail);
      setFriendEmail('');
      setFriendMsg('Done. If that email belongs to a GoalSync member, they will see your request here when they log in.');
    } catch (err) {
      setFriendErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>, okMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.show(okMessage);
    } catch (err) {
      toast.show((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page settings">
      <section className="card" aria-labelledby="profile-h">
        <h2 id="profile-h">Profile</h2>
        <form className="form" onSubmit={saveName} noValidate>
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input id="display-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            {nameError && <p className="field-error">{nameError}</p>}
          </div>
          <div className="field">
            <label htmlFor="account-email">Account email</label>
            <input id="account-email" className="input" value={user?.email ?? ''} readOnly />
          </div>
          <div><button className="btn btn-primary" disabled={savingName || name.trim() === profile?.display_name}>{savingName ? 'Saving…' : 'Save name'}</button></div>
        </form>
      </section>

      <section className="card" aria-labelledby="look-h">
        <h2 id="look-h">Appearance</h2>
        <p className="muted">These choices belong to your account only. Your friend keeps their own.</p>

        <h3>Mode</h3>
        <div className="mode-grid" role="radiogroup" aria-label="Light, dark or system mode">
          {MODES.map(({ value, label, icon: Icon, hint }) => (
            <button key={value} role="radio" aria-checked={mode === value} className={`mode-option${mode === value ? ' on' : ''}`} onClick={() => setMode(value)}>
              <Icon size={20} aria-hidden />
              <strong>{label}</strong>
              <span>{value === 'system' ? `${hint} (now ${resolved})` : hint}</span>
            </button>
          ))}
        </div>

        <h3>Colour theme</h3>
        <div className="swatch-grid" role="radiogroup" aria-label="Colour theme">
          {ACCENT_KEYS.map((key) => (
            <button
              key={key} role="radio" aria-checked={accent === key} className={`swatch${accent === key ? ' on' : ''}`} onClick={() => setAccent(key)}
            >
              <span className="swatch-dot" style={{ background: ACCENTS[key][resolved].accent }} aria-hidden>
                {accent === key && <Check size={16} strokeWidth={3} style={{ color: ACCENTS[key][resolved].on }} />}
              </span>
              {ACCENTS[key].label}
            </button>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="friend-set-h">
        <h2 id="friend-set-h">Friend connection</h2>

        {!friendship && (
          <>
            <p className="muted">You are not connected yet. Enter your friend’s account email to send a request. They must accept it before anything is shared.</p>
            <form className="form inline-form" onSubmit={onSendRequest} noValidate>
              <div className="field">
                <label htmlFor="friend-email">Friend’s email</label>
                <input id="friend-email" type="email" className="input" value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} autoComplete="off" />
              </div>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </form>
            {friendErr && <p className="form-error" role="alert">{friendErr}</p>}
            {friendMsg && <p className="notice-text" role="status">{friendMsg}</p>}
          </>
        )}

        {friendship?.status === 'pending' && friendship.i_am_requester && (
          <>
            <p><strong>Request sent.</strong> Waiting for {friendship.other_name} to accept.</p>
            <button className="btn btn-secondary" disabled={busy} onClick={() => void run(disconnect, 'Request cancelled')}>Cancel request</button>
          </>
        )}

        {friendship?.status === 'pending' && !friendship.i_am_requester && (
          <>
            <p><strong>{friendship.other_name}</strong> wants to connect with you. If you accept, you can both see each other’s tasks and progress (read-only).</p>
            <div className="row-actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => respondToRequest(friendship.id, true), 'Connected')}>Accept</button>
              <button className="btn btn-secondary" disabled={busy} onClick={() => void run(() => respondToRequest(friendship.id, false), 'Request declined')}>Decline</button>
            </div>
          </>
        )}

        {friendship?.status === 'accepted' && (
          <>
            <p><strong>Connected with {friendship.other_name}</strong>{friendship.accepted_at ? ` since ${formatMedium(friendship.accepted_at.slice(0, 10))}` : ''}.</p>
            <button className="btn btn-secondary btn-danger-text" onClick={() => setConfirmDisconnect(true)}>Disconnect</button>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="privacy-h">
        <h2 id="privacy-h">Privacy: what is shared</h2>
        <div className="two-col">
          <div>
            <h3>Your friend can see</h3>
            <ul className="plain-list">
              <li>Your display name</li>
              <li>Your task titles, categories, dates and times</li>
              <li>Whether each task is completed, and when</li>
              <li>Progress and charts calculated from those tasks</li>
            </ul>
          </div>
          <div>
            <h3>Never shared</h3>
            <ul className="plain-list">
              <li>Your email address and password</li>
              <li>Your appearance settings</li>
              <li>Your status-change history log</li>
            </ul>
          </div>
        </div>
        <p className="muted">Your friend can only <strong>read</strong>. They can never add, edit, complete or delete your tasks. Disconnecting stops sharing right away and does not delete anyone’s tasks.</p>
      </section>

      <section className="card" aria-labelledby="account-h">
        <h2 id="account-h">Account</h2>
        <div className="row-actions">
          <button className="btn btn-secondary" disabled={busy} onClick={() => void run(() => sendPasswordReset(user?.email ?? ''), 'Password reset email sent')}>Email me a password reset link</button>
          <button className="btn btn-secondary" onClick={() => void signOut()}>Sign out</button>
        </div>
        <p className="muted">Deleting an account is not available inside the app. The site owner can remove an account in the Supabase dashboard; that also deletes its tasks.</p>
      </section>

      {confirmDisconnect && (
        <ConfirmDialog
          title={`Disconnect from ${friendship?.other_name}?`}
          message="You will both stop seeing each other’s tasks and progress immediately. Nobody’s tasks are deleted. You can reconnect later by sending a new request."
          confirmLabel="Disconnect"
          danger
          busy={busy}
          onCancel={() => setConfirmDisconnect(false)}
          onConfirm={() => void run(disconnect, 'Disconnected').then(() => setConfirmDisconnect(false))}
        />
      )}
    </div>
  );
}
