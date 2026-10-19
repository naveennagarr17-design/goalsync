import AuthShell from './AuthShell';

export default function SetupNeeded() {
  return (
    <AuthShell title="One more setup step" subtitle="GoalSync cannot find your Supabase settings yet.">
      <ol className="steps">
        <li>In the project folder, copy <code>.env.example</code> to a new file named <code>.env.local</code>.</li>
        <li>Open <code>.env.local</code> and paste your Supabase <strong>Project URL</strong> and <strong>public (anon / publishable) key</strong>.</li>
        <li>Stop the app (press <code>Ctrl + C</code> in the terminal) and start it again with <code>npm run dev</code>.</li>
      </ol>
      <p className="muted">The full walkthrough is in the setup guide (PDF) that came with the project.</p>
    </AuthShell>
  );
}
