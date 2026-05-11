'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import { demoReports, demoUsers } from '@/lib/demo-data';

export default function AdminReportsPage() {
  const [worker, setWorker] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const workers = demoUsers.filter((u) => u.role === 'worker');
  const items = useMemo(() => demoReports.filter((r) => {
    if (worker && r.workerName !== worker) return false;
    if (orderNo && !r.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
    if (from && r.reportDate < from) return false;
    if (to && r.reportDate > to) return false;
    return true;
  }), [worker, orderNo, from, to]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Отчеты" role="Работодатель">
          <div className="card p-4 mb-4 grid gap-3 md:grid-cols-4">
            <select className="input" value={worker} onChange={(e) => setWorker(e.target.value)}>
              <option value="">Все работники</option>
              {workers.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
            <input className="input" placeholder="Номер заказа" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <ReportsTable items={items} />
        </AppShell>
      )}
    </RequireUser>
  );
}
