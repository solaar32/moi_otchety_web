'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

type WorkerRow = {
  id: string;
  login: string;
  fullName: string;
  active: boolean;
  role: 'admin' | 'worker';
  createdAt?: string;
  updatedAt?: string;
};

type DraftRow = WorkerRow & { password: string };

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWorkers() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/workers', { cache: 'no-store' });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? 'Ошибка загрузки работников');
      return;
    }
    setWorkers(json.workers ?? []);
    const nextDrafts: Record<string, DraftRow> = {};
    for (const worker of json.workers ?? []) {
      nextDrafts[worker.id] = { ...worker, password: '' };
    }
    setDrafts(nextDrafts);
  }

  useEffect(() => {
    loadWorkers();
  }, []);

  async function addWorker() {
    setMessage('');
    setError('');
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, fullName, password, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Ошибка добавления работника');
      return;
    }
    setLogin('');
    setFullName('');
    setPassword('');
    setRole('worker');
    setMessage(role === 'admin' ? 'Администратор добавлен' : 'Работник добавлен');
    await loadWorkers();
  }

  async function saveWorker(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setMessage('');
    setError('');
    const res = await fetch(`/api/workers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Ошибка сохранения работника');
      return;
    }
    setMessage('Работник сохранен');
    await loadWorkers();
  }

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Пользователи" role="Работодатель">
          <div className="card p-4 mb-4 space-y-3">
            <h2 className="text-lg font-bold">Добавить пользователя</h2>
            <p className="text-sm text-slate-500">Администратор получает все функции работодателя: отчеты, прайс, выплаты, журнал и резервные копии.</p>
            <div className="grid gap-3 md:grid-cols-5">
              <input className="input" placeholder="Логин / фамилия" value={login} onChange={(e) => setLogin(e.target.value)} />
              <input className="input" placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input className="input" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'worker' | 'admin')}>
                <option value="worker">Работник</option>
                <option value="admin">Администратор</option>
              </select>
              <button className="btn-primary" onClick={addWorker}>Добавить</button>
            </div>
          </div>

          {message && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-4 text-sm text-slate-600">Загрузка работников...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--brand-soft)] text-left">
                  <tr>
                    <th className="p-3">Логин</th>
                    <th className="p-3">ФИО</th>
                    <th className="p-3">Новый пароль</th>
                    <th className="p-3">Роль</th>
                    <th className="p-3">Статус</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => {
                    const draft = drafts[worker.id] ?? { ...worker, password: '' };
                    return (
                      <tr key={worker.id} className="border-t border-[var(--line)] align-top">
                        <td className="p-3">
                          <input className="input" value={draft.login} onChange={(e) => updateDraft(worker.id, { login: e.target.value })} />
                        </td>
                        <td className="p-3">
                          <input className="input" value={draft.fullName} onChange={(e) => updateDraft(worker.id, { fullName: e.target.value })} />
                        </td>
                        <td className="p-3">
                          <input className="input" placeholder="Не менять" value={draft.password} onChange={(e) => updateDraft(worker.id, { password: e.target.value })} />
                        </td>
                        <td className="p-3">
                          <select className="input" value={draft.role} onChange={(e) => updateDraft(worker.id, { role: e.target.value as 'worker' | 'admin' })}>
                            <option value="worker">Работник</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={draft.active} onChange={(e) => updateDraft(worker.id, { active: e.target.checked })} />
                            {draft.active ? 'Активен' : 'Отключен'}
                          </label>
                        </td>
                        <td className="p-3">
                          <button className="btn-primary" onClick={() => saveWorker(worker.id)}>Сохранить</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
