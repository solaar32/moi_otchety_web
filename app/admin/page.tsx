'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { demoReports, demoUsers } from '@/lib/demo-data';

export default function AdminPage() {
  const total = demoReports.reduce((acc, r) => acc + r.total, 0);
  const workersCount = demoUsers.filter((u) => u.role === 'worker').length;

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Панель работодателя" role="Работодатель">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="text-sm text-slate-500">Сумма в демо-отчетах</div>
              <div className="mt-2 text-3xl font-bold">{total.toFixed(2)}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Работников</div>
              <div className="mt-2 text-3xl font-bold">{workersCount}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Операций</div>
              <div className="mt-2 text-3xl font-bold">{demoReports.length}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/reports">Отчеты и фильтры</Link>
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/workers">Работники</Link>
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/prices">Прайс Excel</Link>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
