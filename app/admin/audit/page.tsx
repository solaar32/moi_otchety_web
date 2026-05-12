'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { AuditLogItem } from '@/lib/types';

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAudit() {
    setLoading(true);
    const res = await fetch('/api/audit');
    const json = await res.json().catch(() => null);
    if (res.ok) setItems(json.items ?? []);
    setLoading(false);
  }

  useEffect(() => { loadAudit(); }, []);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Журнал действий" role="Работодатель">
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
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--line)]">
                        <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString('ru-RU')}</td>
                        <td className="p-3">{item.actorName ?? '-'}</td>
                        <td className="p-3">{item.action}</td>
                        <td className="p-3">{item.description}</td>
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
