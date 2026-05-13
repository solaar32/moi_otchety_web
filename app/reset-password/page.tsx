'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP_VERSION_LABEL } from '@/lib/app-info';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Ссылка восстановления некорректна');
      return;
    }

    if (!password || password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }

    if (password !== repeat) {
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

    setMessage('Пароль изменён. Теперь можно войти.');
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Новый пароль</h1>
        <p className="text-xs text-slate-500">{APP_VERSION_LABEL}</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Новый пароль</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">Повторите пароль</span>
        <input
          className="input"
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </label>

      {message && (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button className="btn-primary w-full disabled:opacity-50" type="submit" disabled={loading}>
        {loading ? 'Сохраняем...' : 'Сменить пароль'}
      </button>

      <a className="block text-center text-sm text-[var(--brand)]" href="/">
        Вернуться ко входу
      </a>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="text-sm text-slate-500">Загрузка...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
