'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

export default function AdminBackupPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function restoreBackup(file?: File) {
    if (!file) return;

    if (!confirm('Восстановить резервную копию? Текущие данные будут заменены данными из файла.')) {
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? 'Не удалось восстановить резервную копию');
      }

      setMessage('Резервная копия восстановлена. Проверьте работников, прайс, отчёты и выплаты.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка восстановления');
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Резервные копии" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <h1 className="text-3xl font-black text-slate-900">
                Резервные копии
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Скачивание и восстановление данных системы. Перед восстановлением обязательно скачайте свежую копию.
              </p>
            </section>

            {message && (
              <div className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
                {message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Скачать backup JSON</h2>

                <p className="mt-2 text-sm text-slate-600">
                  Файл содержит работников, администраторов, прайс, отчёты, выплаты, историю действий и версии прайса.
                </p>

                <a
                  className="mt-4 inline-flex rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                  href="/api/backups"
                >
                  Скачать резервную копию
                </a>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Восстановить из backup</h2>

                <p className="mt-2 text-sm text-slate-600">
                  Используйте только проверенный JSON-файл, скачанный из этой системы.
                  Перед восстановлением сделайте свежую резервную копию.
                </p>

                <input
                  ref={inputRef}
                  className="input mt-4"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => restoreBackup(event.target.files?.[0])}
                  disabled={busy}
                />

                {busy && (
                  <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Восстановление...
                  </div>
                )}
              </div>
            </div>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}