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
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-[2rem] bg-white p-6 shadow-2xl">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] text-2xl font-black text-white">
          ВЕК
        </div>

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          Новый пароль
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Придумайте новый пароль для входа
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {APP_VERSION_LABEL}
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Новый пароль</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none transition focus:border-[var(--brand)] focus:bg-white"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Повторите пароль</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none transition focus:border-[var(--brand)] focus:bg-white"
          type="password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <button
        className="w-full rounded-2xl bg-[var(--brand)] px-4 py-4 text-lg font-black text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Сохраняем...' : 'Сменить пароль'}
      </button>

      <a
        className="block text-center text-sm font-bold text-[var(--brand)] hover:underline"
        href="/"
      >
        Вернуться ко входу
      </a>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Suspense fallback={<div className="text-sm text-slate-500">Загрузка...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}