'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[var(--brand)] text-white flex items-center justify-center text-2xl font-bold">ВЕК</div>
          <h1 className="text-2xl font-bold">Мои отчеты</h1>
          <p className="text-sm text-slate-600">Вход работника или работодателя</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Логин</span>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Фамилия или admin" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Пароль</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
        </label>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button className="btn-primary w-full disabled:opacity-50" type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <b>Первый вход:</b> admin / admin123 или Иванов / 123456
        </div>
      </form>
    </main>
  );
}
