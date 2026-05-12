'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

export default function AdminReportsPage() {
  const [worker, setWorker] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [section, setSection] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    setLoading(true);
    await fetch('/api/reports')
      .then((r) => r.json())
      .then((j) => setRows(j.items ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports();
  }, []);

  const workers = Array.from(new Set(rows.map((r) => r.workerName))).sort();
  const sections = Array.from(new Set(rows.map((r) => r.section))).sort();
  const items = useMemo(() => rows.filter((r) => {
    if (worker && r.workerName !== worker) return false;
    if (section && r.section !== section) return false;
    if (orderNo && !r.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
    if (from && r.reportDate < from) return false;
    if (to && r.reportDate > to) return false;
    return true;
  }), [rows, worker, section, orderNo, from, to]);

  const workerTotal = items.reduce((acc, item) => acc + item.total, 0);
  const customerTotal = items.reduce((acc, item) => acc + (item.customerTotal ?? 0), 0);
  const ordersCount = new Set(items.map((item) => item.orderNo)).size;

  async function acceptItem(item: ReportItem) {
    const res = await fetch(`/api/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) { alert(json?.error ?? 'Ошибка принятия'); return; }
    await loadReports();
  }

  async function rejectItem(item: ReportItem) {
    const comment = prompt('Причина отклонения', item.rejectComment ?? '');
    if (comment === null) return;
    const res = await fetch(`/api/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', comment }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) { alert(json?.error ?? 'Ошибка отклонения'); return; }
    await loadReports();
  }

  function exportUrl(format: 'csv' | 'print') {
    const params = new URLSearchParams();
    if (worker) params.set('worker', worker);
    if (section) params.set('section', section);
    if (orderNo) params.set('orderNo', orderNo);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', format);
    return `/api/exports/reports?${params.toString()}`;
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Отчеты" role="Работодатель">
          <div className="grid gap-3 md:grid-cols-4 mb-4">
            <div className="card p-4">
              <div className="text-sm text-slate-500">Строк по фильтру</div>
              <div className="text-2xl font-bold">{items.length}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Заказов</div>
              <div className="text-2xl font-bold">{ordersCount}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Сумма работникам</div>
              <div className="text-2xl font-bold">{workerTotal.toFixed(2)}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Сумма заказчику</div>
              <div className="text-2xl font-bold">{customerTotal.toFixed(2)}</div>
            </div>
          </div>

          <div className="card p-4 mb-4 grid gap-3 md:grid-cols-5">
            <select className="input" value={worker} onChange={(e) => setWorker(e.target.value)}>
              <option value="">Все работники</option>
              {workers.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Все разделы</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="input" placeholder="Номер заказа" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <a className="btn" href={exportUrl('csv')}>Скачать Excel/CSV</a>
            <a className="btn-secondary" href={exportUrl('print')} target="_blank">PDF / печать</a>
          </div>
          {loading ? <div className="card p-4">Загрузка...</div> : <ReportsTable items={items} showCustomer onAccept={acceptItem} onReject={rejectItem} />}
        </AppShell>
      )}
    </RequireUser>
  );
}
