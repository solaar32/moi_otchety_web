use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

type OperationType = 'cutPolish' | 'cut' | 'polish';

type PriceCategory = {
  id: string;
  name: string;
  items: {
    id: string;
    sectionId: string;
    name: string;
    unit: string;
    priceWorker: number | null;
    priceCustomer?: number | null;
    priceCutPolish?: number | null;
    priceCut?: number | null;
    pricePolish?: number | null;
  }[];
};

const operationLabels: Record<OperationType, string> = {
  cutPolish: 'Резка+полировка',
  cut: 'Резка',
  polish: 'Полировка',
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
  const [operationType, setOperationType] = useState<OperationType>('cutPolish');
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

  const selectedSection = categories.find((s) => s.id === sectionId);
  const isDecorative = selectedSection?.name.trim().toLowerCase() === 'декоративка';
  const sectionItems = useMemo(
    () => selectedSection?.items ?? [],
    [selectedSection]
  );
  const selectedItem = sectionItems.find((p) => p.id === priceItemId);

  const availableOperations = useMemo(() => {
    if (!selectedItem || !isDecorative) return [] as OperationType[];
    const ops: OperationType[] = [];
    if (selectedItem.priceCutPolish !== null && selectedItem.priceCutPolish !== undefined) ops.push('cutPolish');
    if (selectedItem.priceCut !== null && selectedItem.priceCut !== undefined) ops.push('cut');
    if (selectedItem.pricePolish !== null && selectedItem.pricePolish !== undefined) ops.push('polish');
    return ops;
  }, [isDecorative, selectedItem]);

  useEffect(() => {
    if (availableOperations.length > 0 && !availableOperations.includes(operationType)) {
      setOperationType(availableOperations[0]);
    }
  }, [availableOperations, operationType]);

  const numericQty = Number(qty.replace(',', '.')) || 0;

  const selectedPrice = useMemo(() => {
    if (!selectedItem) return null;
    if (!isDecorative) return selectedItem.priceWorker ?? null;
    if (operationType === 'cutPolish') return selectedItem.priceCutPolish ?? null;
    if (operationType === 'cut') return selectedItem.priceCut ?? null;
    if (operationType === 'polish') return selectedItem.pricePolish ?? null;
    return null;
  }, [isDecorative, operationType, selectedItem]);

  const previewTotal = numericQty * (selectedPrice ?? 0);

  async function addRow() {
    if (!selectedItem || !orderNo.trim()) {
      setError('Выберите операцию и укажите номер заказа');
      return;
    }
    if (isDecorative && availableOperations.length === 0) {
      setError('У выбранной операции нет доступного вида работ');
      return;
    }
    if (selectedPrice === null || selectedPrice === undefined) {
      setError('У выбранной операции нет цены для работника');
      return;
    }
    if (numericQty <= 0) {
      setError('Укажите объем больше нуля');
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
        operationType: isDecorative ? operationType : null,
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

  function chooseSection(id: string) {
    setSectionId(id);
    setPriceItemId('');
    setOperationType('cutPolish');
  }

  return (
    <AppShell title="Мои отчеты" role={`Работник: ${userName}`}>
      <div className="grid gap-4 lg:grid-cols-[430px_1fr]">
        <section className="card p-4 space-y-3">
          <h2 className="text-lg font-bold">Новая операция</h2>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Дата</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-semibold">Раздел прайса</span>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSection(s.id)}
                  className={
                    s.id === sectionId
                      ? 'rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white'
                      : 'rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-slate-700'
                  }
                  title={s.name}
                >
                  <span className="line-clamp-2">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Операция {selectedSection ? `— ${selectedSection.name}` : ''}</span>
            <select className="input" value={priceItemId} onChange={(e) => setPriceItemId(e.target.value)}>
              <option value="">Выберите операцию</option>
              {sectionItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.unit}
                </option>
              ))}
            </select>
            {selectedSection && sectionItems.length === 0 && (
              <span className="text-xs text-red-600">В этом разделе пока нет импортированных операций</span>
            )}
          </label>
          {isDecorative && selectedItem && (
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Вид работы</span>
              <select className="input" value={operationType} onChange={(e) => setOperationType(e.target.value as OperationType)}>
                {availableOperations.map((op) => (
                  <option key={op} value={op}>
                    {operationLabels[op]}
                  </option>
                ))}
              </select>
              {availableOperations.length === 0 && (
                <span className="text-xs text-red-600">Для этой операции нет цен резки/полировки</span>
              )}
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Номер заказа</span>
            <input className="input" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="Например 101" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Объем</span>
            <input className="input" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </label>
          {selectedItem && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
              <div>Ед. изм.: <b>{selectedItem.unit}</b></div>
              <div>Цена работника: <b>{selectedPrice ?? '-'}</b></div>
              {selectedItem.priceCustomer !== null && selectedItem.priceCustomer !== undefined && (
                <div>Цена заказчика: <b>{selectedItem.priceCustomer}</b></div>
              )}
              <div>Итого работнику: <b>{previewTotal.toFixed(2)}</b></div>
            </div>
          )}
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
