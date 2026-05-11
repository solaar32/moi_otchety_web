'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { demoUsers } from '@/lib/demo-data';

export default function WorkersPage() {
  const [workers, setWorkers] = useState(demoUsers.filter((u) => u.role === 'worker'));
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');

  function addWorker() {
    if (!login.trim() || !name.trim()) return;
    setWorkers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), login, name, role: 'worker' as const, active: true },
    ]);
    setLogin('');
    setName('');
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Работники" role="Работодатель">
          <div className="card p-4 mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input className="input" placeholder="Логин / фамилия" value={login} onChange={(e) => setLogin(e.target.value)} />
            <input className="input" placeholder="ФИО" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary" onClick={addWorker}>Добавить</button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--brand-soft)] text-left">
                <tr>
                  <th className="p-3">Логин</th>
                  <th className="p-3">ФИО</th>
                  <th className="p-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id} className="border-t border-[var(--line)]">
                    <td className="p-3 font-semibold">{w.login}</td>
                    <td className="p-3">{w.name}</td>
                    <td className="p-3">{w.active ? 'Активен' : 'Отключен'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
