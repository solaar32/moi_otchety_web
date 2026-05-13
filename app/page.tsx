'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка входа');
      return;
    }

    router.push(json.user.role === 'admin' ? '/admin' : '/worker');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-bold text-white">ВЕК</div>
          <div>
            <h1 className="text-2xl font-bold">Мои отчеты</h1>
            <p className="mt-1 text-xs text-slate-500">{APP_VERSION_LABEL}</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Логин</span>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Пароль</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button className="btn-primary w-full disabled:opacity-50" type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
<a
  href="/forgot-password"
  className="block text-center text-sm font-medium text-[var(--brand)] hover:underline"
>
  Забыли пароль?
</a>
      </form>
    </main>
  );
}
