'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.15fr_.85fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-[-80px] top-[-80px] h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-120px] h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
              Production · {APP_VERSION_LABEL}
            </div>

            <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
              Мои отчёты
            </h1>

            <p className="mt-5 max-w-lg text-lg text-slate-300">
              Учёт выполненных работ, проверка операций, выплаты работникам и резервное копирование данных.
            </p>

            <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-2xl font-black">24/7</div>
                <div className="mt-1 text-sm text-slate-300">Доступ с телефона и ПК</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-2xl font-black">HTTPS</div>
                <div className="mt-1 text-sm text-slate-300">Защищённое соединение</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="text-2xl font-black">Backup</div>
                <div className="mt-1 text-sm text-slate-300">Резерв каждый час</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="font-bold">Защита и контроль</div>
            <div className="mt-1 text-sm text-slate-300">
              Ограничение попыток входа · журнал безопасности · восстановление пароля через email
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8">
          <form onSubmit={submit} className="w-full max-w-md space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[var(--brand)] text-3xl font-black text-white shadow-lg">
                ВЕК
              </div>

              <h2 className="mt-5 text-3xl font-black text-slate-900">
                Вход в систему
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Работодатель, администратор или работник
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {APP_VERSION_LABEL}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Логин</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-semibold outline-none transition focus:border-[var(--brand)] focus:bg-white"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                placeholder="Введите логин"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">Пароль</span>
              <div className="relative">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pr-20 text-base font-semibold outline-none transition focus:border-[var(--brand)] focus:bg-white"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </label>

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
              {loading ? 'Вход...' : 'Войти'}
            </button>

            <a
              href="/forgot-password"
              className="block text-center text-sm font-bold text-[var(--brand)] hover:underline"
            >
              Забыли пароль?
            </a>

            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <b>Подсказка:</b> если забыли пароль, используйте восстановление через email или обратитесь к администратору.
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}