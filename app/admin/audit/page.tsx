'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { AuditLogItem } from '@/lib/types';

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadAudit() {
    setLoading(true);
    const res = await fetch('/api/audit');
    const json = await res.json().catch(() => null);
    if (res.ok) setItems(json.items ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAudit(); }, []);

  async function undoAudit(id: string) {
    if (!confirm('Отменить действие из журнала? Некоторые действия нельзя отменить автоматически.')) return;
    setMessage('');
    const res = await fetch(`/api/audit/${id}`, { method: 'PATCH' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? 'Не удалось отменить действие');
      return;
    }
    setMessage('Действие отменено');
    await loadAudit();
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Журнал действий" role="Работодатель">
          {message && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold">{message}</div>}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-4">Загрузка...</div>
            ) : items.length === 0 ? (
              <div className="p-4">Журнал пока пуст.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--brand-soft)] text-left">
                    <tr>
                      <th className="p-3">Дата</th>
                      <th className="p-3">Пользователь</th>
                      <th className="p-3">Действие</th>
                      <th className="p-3">Описание</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--line)]">
                        <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('ru-RU')}</td>
                        <td className="p-3">{item.actorName ?? '-'}</td>
                        <td className="p-3">{item.action}</td>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right">
                          {!item.action.endsWith('_UNDO') && (
                            <button className="text-xs font-semibold text-[var(--brand)]" onClick={() => undoAudit(item.id)}>Отменить</button>
                          )}
                        </td>
                      </tr>
                    ))}
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
