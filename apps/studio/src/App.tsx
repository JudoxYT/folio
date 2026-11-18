import { useEffect, useState } from 'react';
import { api } from './api';
import { Editor } from './Editor';
import { loadAll, useStore } from './store';
import { edition, isFolio, loadEdition } from './edition';

type Auth = { user: { email: string } | null; needsSetup: boolean } | null;

export function App() {
  const [auth, setAuth] = useState<Auth>(null);
  const ready = useStore((s) => s.ready);

  const check = async () => {
    await loadEdition();
    const a = await api.get<NonNullable<Auth>>('/api/auth/me');
    setAuth(a);
    if (a.user) await loadAll();
  };
  useEffect(() => {
    void check();
  }, []);

  if (!auth) return <div className="vs-splash">Laden…</div>;
  if (!auth.user && isFolio())
    return (
      <div className="vs-login">
        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Folio</h1>
          <p>Deze website open je via de Folio-app. Ga terug naar <b>Mijn websites</b> en open hem opnieuw.</p>
        </form>
      </div>
    );
  if (!auth.user) return <Login setup={auth.needsSetup} onDone={check} />;
  if (!ready) return <div className="vs-splash">Studio laden…</div>;
  return (
    <Editor
      onLogout={async () => {
        await api.post('/api/auth/logout');
        location.reload();
      }}
    />
  );
}

function Login({ setup, onDone }: { setup: boolean; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="vs-login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api.post(setup ? '/api/auth/setup' : '/api/auth/login', { email, password });
            onDone();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>{edition.productName}</h1>
        <p>{setup ? 'Welkom! Maak je account aan. Dit kan maar één keer.' : 'Log in om je site te bewerken.'}</p>
        <label>
          Mailadres
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Wachtwoord{setup && ' (minstens 10 tekens)'}
          <input type="password" autoComplete={setup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={setup ? 10 : 1} />
        </label>
        {error && <div className="vs-error">{error}</div>}
        <button className="vs-btn primary" disabled={busy}>{setup ? 'Account aanmaken' : 'Inloggen'}</button>
      </form>
    </div>
  );
}
