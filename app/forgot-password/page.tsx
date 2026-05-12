'use client';

import { useState } from 'react';
import Link from 'next/link';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка восстановления');
      return;
    }

    setMessage(json?.message ?? 'Проверьте почту.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-bold text-white">ВЕК</div>
          <div>
            <h1 className="text-2xl font-bold">Восстановление пароля</h1>
            <p className="mt-1 text-xs text-slate-500">{APP_VERSION_LABEL}</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Логин или email</span>
          <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
        </label>

        {message && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button className="btn-primary w-full disabled:opacity-50" type="submit" disabled={loading}>
          {loading ? 'Отправляем...' : 'Отправить ссылку'}
        </button>

        <Link href="/" className="block text-center text-sm text-[var(--brand)]">Вернуться ко входу</Link>
      </form>
    </main>
  );
}
