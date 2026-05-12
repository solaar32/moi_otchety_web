'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

type LoginAttempt = {
  id: string;
  login: string;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  reason?: string | null;
  createdAt: string;
};

export default function AdminSecurityPage() {
  const [items, setItems] = useState<LoginAttempt[]>([]);
  const [recentFailed, setRecentFailed] = useState(0);
  const [login, setLogin] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (login.trim()) params.set('login', login.trim());
    if (success) params.set('success', success);
    const res = await fetch(`/api/login-attempts?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setItems(data.items ?? []);
      setRecentFailed(data.recentFailed ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const ok = items.filter((i) => i.success).length;
    const fail = items.length - ok;
    const ips = new Set(items.map((i) => i.ip).filter(Boolean)).size;
    return { ok, fail, ips };
  }, [items]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Безопасность" role="Работодатель">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-4"><div className="text-sm text-slate-500">Успешных входов</div><div className="mt-2 text-3xl font-bold">{stats.ok}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">Ошибок входа</div><div className="mt-2 text-3xl font-bold">{stats.fail}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">Ошибок за 15 минут</div><div className="mt-2 text-3xl font-bold">{recentFailed}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">IP-адресов</div><div className="mt-2 text-3xl font-bold">{stats.ips}</div></div>
          </div>

          <div className="card mt-4 p-4">
            <h2 className="text-lg font-bold">Журнал входов</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_140px]">
              <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Фильтр по логину" />
              <select className="input" value={success} onChange={(e) => setSuccess(e.target.value)}>
                <option value="">Все попытки</option>
                <option value="true">Только успешные</option>
                <option value="false">Только ошибки</option>
              </select>
              <button className="btn" onClick={load}>Показать</button>
            </div>
          </div>

          <div className="card mt-4 overflow-hidden">
            {loading ? <div className="p-4">Загрузка...</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--brand-soft)] text-left">
                    <tr>
                      <th className="p-3">Дата</th>
                      <th className="p-3">Логин</th>
                      <th className="p-3">Статус</th>
                      <th className="p-3">Причина</th>
                      <th className="p-3">IP</th>
                      <th className="p-3">Устройство</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--line)]">
                        <td className="whitespace-nowrap p-3">{new Date(item.createdAt).toLocaleString('ru-RU')}</td>
                        <td className="p-3 font-semibold">{item.login}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.success ? 'Успешно' : 'Ошибка'}</span></td>
                        <td className="p-3">{item.reason ?? '-'}</td>
                        <td className="p-3">{item.ip ?? '-'}</td>
                        <td className="max-w-sm truncate p-3" title={item.userAgent ?? ''}>{item.userAgent ?? '-'}</td>
                      </tr>
                    ))}
                    {items.length === 0 && <tr><td className="p-4" colSpan={6}>Записей нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
