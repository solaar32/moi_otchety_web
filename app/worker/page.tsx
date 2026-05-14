'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

type OperationType = 'cutPolish' | 'cut' | 'polish';
type Mode = 'price' | 'custom';

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

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  return `${month}.${year}`;
}

function toNumber(value: string) {
  return Number(String(value).replace(',', '.')) || 0;
}

function statusLabel(status?: string) {
  if (status === 'ACCEPTED') return 'Принято';
  if (status === 'REJECTED') return 'Отклонено';
  if (status === 'IN_PAYMENT') return 'В выплате';
  if (status === 'PAID') return 'Оплачено';
  return 'На проверке';
}

function statusClass(status?: string) {
  if (status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'IN_PAYMENT') return 'bg-blue-100 text-blue-700';
  if (status === 'PAID') return 'bg-slate-200 text-slate-700';
  return 'bg-amber-100 text-amber-700';
}

export default function WorkerPage() {
  return (
    <RequireUser role="worker">
      {(user) => <WorkerHome userName={user.name} />}
    </RequireUser>
  );
}

function WorkerHome({ userName }: { userName: string }) {
  const [mode, setMode] = useState<Mode>('price');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sectionId, setSectionId] = useState('');
  const [priceItemId, setPriceItemId] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('cutPolish');
  const [orderNo, setOrderNo] = useState('');
  const [qty, setQty] = useState('1');
  const [operationSearch, setOperationSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [rows, setRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('шт');
  const [customPrice, setCustomPrice] = useState('0');

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
    if (!reportsRes.ok) setError(reportsJson?.error ?? 'Не удалось загрузить отчёты');

    const loadedCategories = pricesJson?.categories ?? [];
    setCategories(loadedCategories);
    setRows(reportsJson?.items ?? []);

    if (!sectionId && loadedCategories.length > 0) {
      setSectionId(loadedCategories[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      setOrderNo(localStorage.getItem('moi_otchety_last_order') ?? '');
      const fav = JSON.parse(localStorage.getItem('moi_otchety_favorites') ?? '[]');
      const recent = JSON.parse(localStorage.getItem('moi_otchety_recent') ?? '[]');
      setFavoriteIds(Array.isArray(fav) ? fav : []);
      setRecentIds(Array.isArray(recent) ? recent : []);
    } catch {}
  }, []);

  const selectedSection = categories.find((s) => s.id === sectionId);
  const isDecorative = selectedSection?.name.trim().toLowerCase() === 'декоративка';
  const sectionItemsRaw = useMemo(() => selectedSection?.items ?? [], [selectedSection]);

  const sectionItems = useMemo(() => {
    const q = operationSearch.trim().toLowerCase();

    return sectionItemsRaw
      .filter((item) => !q || item.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const af = favoriteIds.includes(a.id) ? 0 : 1;
        const bf = favoriteIds.includes(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;

        const ar = recentIds.indexOf(a.id);
        const br = recentIds.indexOf(b.id);
        if (ar !== br) return (ar === -1 ? 999 : ar) - (br === -1 ? 999 : br);

        return a.name.localeCompare(b.name, 'ru');
      });
  }, [favoriteIds, operationSearch, recentIds, sectionItemsRaw]);

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

  const numericQty = toNumber(qty);
  const customPriceNumber = toNumber(customPrice);

  const selectedPrice = useMemo(() => {
    if (!selectedItem) return null;
    if (!isDecorative) return selectedItem.priceWorker ?? null;
    if (operationType === 'cutPolish') return selectedItem.priceCutPolish ?? null;
    if (operationType === 'cut') return selectedItem.priceCut ?? null;
    if (operationType === 'polish') return selectedItem.pricePolish ?? null;
    return null;
  }, [isDecorative, operationType, selectedItem]);

  const previewTotal = mode === 'custom'
    ? numericQty * customPriceNumber
    : numericQty * (selectedPrice ?? 0);

  async function addRow() {
    setError('');

    if (!orderNo.trim()) {
      setError('Укажите номер заказа');
      return;
    }

    if (numericQty <= 0) {
      setError('Укажите количество больше нуля');
      return;
    }

    if (mode === 'price') {
      if (!selectedItem) {
        setError('Выберите операцию');
        return;
      }

      if (selectedPrice === null || selectedPrice === undefined) {
        setError('У выбранной операции нет цены для работника');
        return;
      }
    }

    if (mode === 'custom') {
      if (!customName.trim() || !customUnit.trim()) {
        setError('Заполните наименование и ед. изм.');
        return;
      }

      if (customPriceNumber < 0) {
        setError('Цена не может быть отрицательной');
        return;
      }
    }

    setSaving(true);

    const payload = mode === 'custom'
      ? {
          kind: 'custom',
          workDate: date,
          orderNumber: orderNo,
          operationName: customName,
          unit: customUnit,
          price: customPrice,
          quantity: qty,
        }
      : {
          workDate: date,
          orderNumber: orderNo,
          priceItemId,
          operationType: isDecorative ? operationType : null,
          quantity: qty,
        };

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка сохранения');
      return;
    }

    try {
      localStorage.setItem('moi_otchety_last_order', orderNo.trim());

      if (mode === 'price' && priceItemId) {
        const nextRecent = [priceItemId, ...recentIds.filter((id) => id !== priceItemId)].slice(0, 8);
        localStorage.setItem('moi_otchety_recent', JSON.stringify(nextRecent));
        setRecentIds(nextRecent);
      }
    } catch {}

    setQty('1');
    if (mode === 'custom') {
      setCustomName('');
      setCustomPrice('0');
    }

    await loadData();
  }

  async function deleteRow(item: ReportItem) {
    if (!confirm('Удалить операцию?')) return;

    const res = await fetch(`/api/reports/${item.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка удаления');
      return;
    }

    await loadData();
  }

  async function editRow(item: ReportItem) {
    const newOrder = prompt('Номер заказа', item.orderNo);
    if (newOrder === null) return;

    const newQty = prompt('Количество', String(item.qty).replace('.', ','));
    if (newQty === null) return;

    const res = await fetch(`/api/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: newOrder, quantity: newQty }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError(json?.error ?? 'Ошибка изменения');
      return;
    }

    await loadData();
  }

  function chooseSection(id: string) {
    setMode('price');
    setSectionId(id);
    setPriceItemId('');
    setOperationSearch('');
    setOperationType('cutPolish');
  }

  function chooseCustom() {
    setMode('custom');
    setPriceItemId('');
    setOperationSearch('');
  }

  function toggleFavorite() {
    if (!priceItemId) return;

    const next = favoriteIds.includes(priceItemId)
      ? favoriteIds.filter((id) => id !== priceItemId)
      : [priceItemId, ...favoriteIds].slice(0, 20);

    setFavoriteIds(next);

    try {
      localStorage.setItem('moi_otchety_favorites', JSON.stringify(next));
    } catch {}
  }

  const statusTotals = rows.reduce<Record<string, number>>((acc, row) => {
    const status = row.status ?? 'PENDING';
    acc[status] = (acc[status] ?? 0) + row.total;
    return acc;
  }, {});

  const totalMonth = rows
    .filter((row) => monthKey(row.reportDate) === monthKey(new Date().toISOString().slice(0, 10)))
    .reduce((acc, row) => acc + row.total, 0);

  const totalAll = rows.reduce((acc, row) => acc + row.total, 0);

  const latestRows = rows.slice(0, 5);

  const grouped = useMemo(() => {
    const byMonth = new Map<string, Map<string, ReportItem[]>>();

    for (const row of rows) {
      const m = monthKey(row.reportDate);
      if (!byMonth.has(m)) byMonth.set(m, new Map());

      const days = byMonth.get(m)!;
      if (!days.has(row.reportDate)) days.set(row.reportDate, []);
      days.get(row.reportDate)!.push(row);
    }

    return Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return (
    <AppShell title="Мои отчёты" role={`Работник: ${userName}`}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Текущий месяц</div>
            <div className="mt-1 text-2xl font-black">{totalMonth.toFixed(2)}</div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Всего внесено</div>
            <div className="mt-1 text-2xl font-black">{totalAll.toFixed(2)}</div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">На проверке</div>
            <div className="mt-1 text-2xl font-black">{(statusTotals.PENDING ?? 0).toFixed(2)}</div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Оплачено</div>
            <div className="mt-1 text-2xl font-black">{(statusTotals.PAID ?? 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
          <section className="rounded-[2rem] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Новая операция</h2>
                <p className="text-sm text-slate-500">Быстрое заполнение с телефона</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {mode === 'custom' ? 'Нестандартная' : 'Прайс'}
              </span>
            </div>

            {error && (
              <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-bold text-slate-700">Дата</span>
                <input className="input py-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-bold text-slate-700">Номер заказа</span>
                <input
                  className="input py-3"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  placeholder="Например 101"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Раздел</span>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => chooseSection(s.id)}
                      className={
                        mode === 'price' && s.id === sectionId
                          ? 'rounded-2xl bg-[var(--brand)] px-3 py-3 text-xs font-black text-white'
                          : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700'
                      }
                      title={s.name}
                    >
                      <span className="line-clamp-2">{s.name}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={chooseCustom}
                    className={
                      mode === 'custom'
                        ? 'rounded-2xl bg-[var(--brand)] px-3 py-3 text-xs font-black text-white'
                        : 'rounded-2xl border border-dashed border-[var(--brand)] bg-white px-3 py-3 text-xs font-bold text-[var(--brand)]'
                    }
                  >
                    Нестандартные операции
                  </button>
                </div>
              </div>

              {mode === 'price' ? (
                <>
                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">
                      Поиск операции {selectedSection ? `— ${selectedSection.name}` : ''}
                    </span>
                    <input
                      className="input py-3"
                      value={operationSearch}
                      onChange={(e) => setOperationSearch(e.target.value)}
                      placeholder="Начните вводить название"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">Операция</span>
                    <select className="input py-3" value={priceItemId} onChange={(e) => setPriceItemId(e.target.value)}>
                      <option value="">Выберите операцию</option>
                      {sectionItems.map((p) => (
                        <option key={p.id} value={p.id}>
                          {favoriteIds.includes(p.id) ? '★ ' : ''}
                          {recentIds.includes(p.id) ? '↻ ' : ''}
                          {p.name} — {p.unit}
                        </option>
                      ))}
                    </select>
                  </label>

                  {priceItemId && (
                    <button type="button" className="btn-secondary w-full" onClick={toggleFavorite}>
                      {favoriteIds.includes(priceItemId) ? 'Убрать из избранного' : 'Добавить в избранное'}
                    </button>
                  )}

                  {isDecorative && selectedItem && (
                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-slate-700">Вид работы</span>
                      <select className="input py-3" value={operationType} onChange={(e) => setOperationType(e.target.value as OperationType)}>
                        {availableOperations.map((op) => (
                          <option key={op} value={op}>
                            {operationLabels[op]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              ) : (
                <>
                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">Наименование операции</span>
                    <input
                      className="input py-3"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Например: подгонка детали по месту"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-slate-700">Ед. изм.</span>
                      <input className="input py-3" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-bold text-slate-700">Цена</span>
                      <input className="input py-3" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} inputMode="decimal" />
                    </label>
                  </div>
                </>
              )}

              <label className="block space-y-1">
                <span className="text-sm font-bold text-slate-700">Количество</span>
                <input className="input py-3" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
              </label>

              <div className="rounded-3xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ед. изм.</span>
                  <b>{mode === 'custom' ? customUnit : selectedItem?.unit ?? '-'}</b>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Цена</span>
                  <b>{mode === 'custom' ? customPriceNumber : selectedPrice ?? '-'}</b>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg">
                  <span className="font-bold">Итого</span>
                  <b>{previewTotal.toFixed(2)}</b>
                </div>
              </div>

              <button
                onClick={addRow}
                className="w-full rounded-2xl bg-[var(--brand)] px-4 py-4 text-lg font-black text-white shadow-lg disabled:opacity-50"
                disabled={saving || loading}
              >
                {saving ? 'Сохранение...' : 'Добавить операцию'}
              </button>
            </div>
          </section>

          <section className="min-w-0 space-y-4 overflow-hidden">
            {latestRows.length > 0 && (
              <div className="rounded-[2rem] bg-white p-4 shadow-sm lg:hidden">
                <h2 className="mb-3 text-lg font-black">Последние операции</h2>
                <div className="space-y-2">
                  {latestRows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-slate-100 p-3">
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="font-black">Заказ {row.orderNo}</div>
                          <div className="mt-1 text-sm text-slate-600">{row.operation}</div>
                          <div className="mt-1 text-xs text-slate-400">{row.qty} {row.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black">{row.total.toFixed(2)}</div>
                          <span className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-black ${statusClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-xl font-black">Мои операции</h2>

            {loading ? (
              <div className="rounded-[2rem] bg-white p-4 shadow-sm">Загрузка...</div>
            ) : grouped.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                <div className="text-lg font-black">Операций пока нет</div>
                <p className="mt-2 text-sm text-slate-500">Добавьте первую операцию через форму слева.</p>
              </div>
            ) : (
              grouped.map(([month, days]) => {
                const monthRows = Array.from(days.values()).flat();
                const monthTotal = monthRows.reduce((acc, row) => acc + row.total, 0);

                return (
                  <details
                    key={month}
                    className="overflow-hidden rounded-[2rem] bg-white shadow-sm"
                    open={month === monthKey(new Date().toISOString().slice(0, 10))}
                  >
                    <summary className="cursor-pointer bg-[var(--brand-soft)] p-4 font-black">
                      {monthLabel(month)} — {monthTotal.toFixed(2)}
                    </summary>

                    <div className="space-y-3 p-3">
                      {Array.from(days.entries())
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([day, dayRows]) => (
                          <details key={day} className="rounded-2xl border border-slate-200 bg-white" open={day === date}>
                            <summary className="cursor-pointer p-3 font-bold">
                              {day} — операций: {dayRows.length} — {dayRows.reduce((acc, row) => acc + row.total, 0).toFixed(2)}
                            </summary>
                            <div className="max-w-full overflow-x-auto">
  				<ReportsTable items={dayRows} showWorker={false} onEdit={editRow} onDelete={deleteRow} />
			    </div>
                          </details>
                        ))}
                    </div>
                  </details>
                );
              })
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}