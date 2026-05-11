'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import { demoPriceItems, demoReports, demoSections } from '@/lib/demo-data';

export default function WorkerPage() {
  return (
    <RequireUser role="worker">
      {(user) => <WorkerHome userName={user.name} />}
    </RequireUser>
  );
}

function WorkerHome({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sectionId, setSectionId] = useState(demoSections[0]?.id ?? '');
  const [priceItemId, setPriceItemId] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [qty, setQty] = useState('1');
  const [rows, setRows] = useState(demoReports.filter((r) => r.workerName === userName));

  const sectionItems = useMemo(() => demoPriceItems.filter((p) => p.sectionId === sectionId), [sectionId]);
  const selectedItem = demoPriceItems.find((p) => p.id === priceItemId);

  function addRow() {
    if (!selectedItem || !orderNo.trim()) return;
    const section = demoSections.find((s) => s.id === selectedItem.sectionId)?.name ?? '';
    const numericQty = Number(qty.replace(',', '.')) || 0;
    const total = numericQty * selectedItem.priceWorker;
    setRows((prev) => [
      {
        id: crypto.randomUUID(),
        reportDate: date,
        workerName: userName,
        orderNo,
        section,
        operation: selectedItem.name,
        unit: selectedItem.unit,
        qty: numericQty,
        price: selectedItem.priceWorker,
        total,
      },
      ...prev,
    ]);
    setOrderNo('');
    setQty('1');
  }

  return (
    <AppShell title="Мои отчеты" role={`Работник: ${userName}`}>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-bold">Новый отчет</h2>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Дата</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Раздел прайса</span>
            <select className="input" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPriceItemId(''); }}>
              {demoSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Операция</span>
            <select className="input" value={priceItemId} onChange={(e) => setPriceItemId(e.target.value)}>
              <option value="">Выберите операцию</option>
              {sectionItems.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.priceWorker}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Номер заказа</span>
            <input className="input" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="Например 101" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Объем</span>
            <input className="input" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </label>
          <button onClick={addRow} className="btn-primary w-full">Добавить операцию</button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Мои операции</h2>
          <ReportsTable items={rows} />
        </section>
      </div>
    </AppShell>
  );
}
