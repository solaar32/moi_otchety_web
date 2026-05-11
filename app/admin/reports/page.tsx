'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

export default function AdminReportsPage() {
  const [worker, setWorker] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((j) => setRows(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const workers = Array.from(new Set(rows.map((r) => r.workerName))).sort();
  const items = useMemo(() => rows.filter((r) => {
    if (worker && r.workerName !== worker) return false;
    if (orderNo && !r.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
    if (from && r.reportDate < from) return false;
    if (to && r.reportDate > to) return false;
    return true;
  }), [rows, worker, orderNo, from, to]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Отчеты" role="Работодатель">
          <div className="card p-4 mb-4 grid gap-3 md:grid-cols-4">
            <select className="input" value={worker} onChange={(e) => setWorker(e.target.value)}>
              <option value="">Все работники</option>
              {workers.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <input className="input" placeholder="Номер заказа" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {loading ? <div className="card p-4">Загрузка...</div> : <ReportsTable items={items} />}
        </AppShell>
      )}
    </RequireUser>
  );
}
