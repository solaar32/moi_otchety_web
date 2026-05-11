'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

type PriceCategory = {
  id: string;
  name: string;
  items: {
    id: string;
    sectionId: string;
    name: string;
    unit: string;
    priceWorker: number;
  }[];
};

export default function WorkerPage() {
  return (
    <RequireUser role="worker">
      {(user) => <WorkerHome userName={user.name} />}
    </RequireUser>
  );
}

function WorkerHome({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sectionId, setSectionId] = useState('');
  const [priceItemId, setPriceItemId] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [qty, setQty] = useState('1');
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [rows, setRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    const [pricesRes, reportsRes] = await Promise.all([
      fetch('/api/prices'),
      fetch('/api/reports'),
    ]);
    const pricesJson = await pricesRes.json().catch(() => null);
    const reportsJson = await reportsRes.json().catch(() => null);
    if (!pricesRes.ok) setError(pricesJson?.error ?? 'Не удалось загрузить прайс');
    if (!reportsRes.ok) setError(reportsJson?.error ?? 'Не удалось загрузить отчеты');
    const loadedCategories = pricesJson?.categories ?? [];
    setCategories(loadedCategories);
    setRows(reportsJson?.items ?? []);
    if (!sectionId && loadedCategories.length > 0) setSectionId(loadedCategories[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionItems = useMemo(
    () => categories.find((s) => s.id === sectionId)?.items ?? [],
    [categories, sectionId]
  );
  const selectedItem = sectionItems.find((p) => p.id === priceItemId);
  const previewTotal = selectedItem ? (Number(qty.replace(',', '.')) || 0) * selectedItem.priceWorker : 0;

  async function addRow() {
    if (!selectedItem || !orderNo.trim()) {
      setError('Выберите операцию и укажите номер заказа');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workDate: date,
        orderNumber: orderNo,
        priceItemId,
        quantity: qty,
      }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(json?.error ?? 'Ошибка сохранения');
      return;
    }
    setOrderNo('');
    setQty('1');
    await loadData();
  }

  return (
    <AppShell title="Мои отчеты" role={`Работник: ${userName}`}>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-bold">Новая операция</h2>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Дата</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Раздел прайса</span>
            <select className="input" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPriceItemId(''); }}>
              {categories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          {selectedItem && <div className="rounded-xl bg-slate-50 p-3 text-sm">Итого: <b>{previewTotal.toFixed(2)}</b></div>}
          <button onClick={addRow} className="btn-primary w-full disabled:opacity-50" disabled={saving || loading}>
            {saving ? 'Сохранение...' : 'Добавить операцию'}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Мои операции</h2>
          {loading ? <div className="card p-4">Загрузка...</div> : <ReportsTable items={rows} />}
        </section>
      </div>
    </AppShell>
  );
}
