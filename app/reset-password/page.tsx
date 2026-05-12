'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка смены пароля');
      return;
    }

    setMessage(json?.message ?? 'Пароль изменен');
    setPassword('');
    setPassword2('');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-bold text-white">ВЕК</div>
          <div>
            <h1 className="text-2xl font-bold">Новый пароль</h1>
            <p className="mt-1 text-xs text-slate-500">{APP_VERSION_LABEL}</p>
          </div>
        </div>

        {!token && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Ссылка восстановления некорректна.</div>}

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Новый пароль</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Повторите пароль</span>
          <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
        </label>

        {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button className="btn-primary w-full disabled:opacity-50" type="submit" disabled={loading || !token}>
          {loading ? 'Сохраняем...' : 'Сменить пароль'}
        </button>

        <Link href="/" className="block text-center text-sm text-[var(--brand)]">Вернуться ко входу</Link>
      </form>
    </main>
  );
}
