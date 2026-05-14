'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

type UserRole = 'admin' | 'worker';

type WorkerRow = {
  id: string;
  login: string;
  fullName: string;
  email?: string | null;
  active: boolean;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

type DraftRow = WorkerRow & { password: string };

function roleLabel(role: UserRole) {
  return role === 'admin' ? 'Администратор' : 'Работник';
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});

  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('worker');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

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
      setError(json.error ?? 'Ошибка загрузки пользователей');
      return;
    }

    const loadedWorkers = json.workers ?? [];
    setWorkers(loadedWorkers);

    const nextDrafts: Record<string, DraftRow> = {};

    for (const worker of loadedWorkers) {
      nextDrafts[worker.id] = {
        ...worker,
        email: worker.email ?? '',
        password: '',
      };
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
      body: JSON.stringify({ login, fullName, email, password, role }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Ошибка добавления пользователя');
      return;
    }

    setLogin('');
    setFullName('');
    setEmail('');
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
      setError(json.error ?? 'Ошибка сохранения пользователя');
      return;
    }

    setMessage('Пользователь сохранён');
    await loadWorkers();
  }

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  const stats = useMemo(() => {
    const active = workers.filter((worker) => worker.active).length;
    const disabled = workers.filter((worker) => !worker.active).length;
    const admins = workers.filter((worker) => worker.role === 'admin').length;
    const workerCount = workers.filter((worker) => worker.role === 'worker').length;

    return { active, disabled, admins, workerCount };
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const search = query.trim().toLowerCase();

    return workers.filter((worker) => {
      const draft = drafts[worker.id] ?? { ...worker, password: '' };

      if (statusFilter === 'active' && !draft.active) return false;
      if (statusFilter === 'disabled' && draft.active) return false;

      if (!search) return true;

      return (
        draft.login.toLowerCase().includes(search) ||
        draft.fullName.toLowerCase().includes(search) ||
        String(draft.email ?? '').toLowerCase().includes(search)
      );
    });
  }, [drafts, query, statusFilter, workers]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Пользователи" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Работники и администраторы
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Управляйте доступом, ролями, email для восстановления пароля, активностью и паролями пользователей.
                  </p>
                </div>

                <button
                  onClick={loadWorkers}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                >
                  Обновить
                </button>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Активные</div>
                <div className="mt-2 text-3xl font-black">{stats.active}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отключённые</div>
                <div className="mt-2 text-3xl font-black">{stats.disabled}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Работники</div>
                <div className="mt-2 text-3xl font-black">{stats.workerCount}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Администраторы</div>
                <div className="mt-2 text-3xl font-black">{stats.admins}</div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Добавить пользователя</h2>

              <p className="mt-1 text-sm text-slate-500">
                Администратор получает все функции работодателя: отчёты, прайс, выплаты, журнал и backup.
              </p>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_1.4fr_1fr_1fr_auto]">
                <input
                  className="input py-3"
                  placeholder="Логин"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                />

                <input
                  className="input py-3"
                  placeholder="ФИО"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />

                <input
                  className="input py-3"
                  placeholder="Email для восстановления"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <input
                  className="input py-3"
                  placeholder="Пароль"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <select
                  className="input py-3"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <option value="worker">Работник</option>
                  <option value="admin">Администратор</option>
                </select>

                <button
                  className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                  onClick={addWorker}
                >
                  Добавить
                </button>
              </div>
            </section>

            {message && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black">Список пользователей</h2>
                  <p className="text-sm text-slate-500">
                    Найдено: {filteredWorkers.length}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="input py-3"
                    placeholder="Поиск по ФИО, логину, email"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />

                  <select
                    className="input py-3"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'disabled')}
                  >
                    <option value="all">Все</option>
                    <option value="active">Активные</option>
                    <option value="disabled">Отключённые</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Загрузка пользователей...
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center">
                  <div className="text-lg font-black">Пользователи не найдены</div>
                  <p className="mt-2 text-sm text-slate-500">
                    Измените поиск или фильтр.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {filteredWorkers.map((worker) => {
                    const draft = drafts[worker.id] ?? { ...worker, email: worker.email ?? '', password: '' };

                    return (
                      <div
                        key={worker.id}
                        className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black">{draft.fullName || 'Без ФИО'}</div>

                            <div className="mt-1 text-sm text-slate-500">
                              @{draft.login} · {roleLabel(draft.role)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              draft.active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {draft.active ? 'Активен' : 'Отключён'}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-slate-700">Логин</span>
                            <input
                              className="input py-3"
                              value={draft.login}
                              onChange={(event) => updateDraft(worker.id, { login: event.target.value })}
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-slate-700">ФИО</span>
                            <input
                              className="input py-3"
                              value={draft.fullName}
                              onChange={(event) => updateDraft(worker.id, { fullName: event.target.value })}
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-slate-700">Email</span>
                            <input
                              className="input py-3"
                              placeholder="Для восстановления пароля"
                              value={draft.email ?? ''}
                              onChange={(event) => updateDraft(worker.id, { email: event.target.value })}
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-slate-700">Новый пароль</span>
                            <input
                              className="input py-3"
                              placeholder="Не менять"
                              value={draft.password}
                              onChange={(event) => updateDraft(worker.id, { password: event.target.value })}
                            />
                          </label>

                          <label className="block space-y-1">
                            <span className="text-sm font-bold text-slate-700">Роль</span>
                            <select
                              className="input py-3"
                              value={draft.role}
                              onChange={(event) => updateDraft(worker.id, { role: event.target.value as UserRole })}
                            >
                              <option value="worker">Работник</option>
                              <option value="admin">Администратор</option>
                            </select>
                          </label>

                          <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold">
                            <input
                              type="checkbox"
                              checked={draft.active}
                              onChange={(event) => updateDraft(worker.id, { active: event.target.checked })}
                            />
                            Пользователь активен
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                            onClick={() => saveWorker(worker.id)}
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}