'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

function statusTotal(items: ReportItem[], status: string) {
  return items
    .filter((item) => (item.status ?? 'PENDING') === status)
    .reduce((acc, item) => acc + item.total, 0);
}

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
      .then((res) => res.json())
      .then((json) => setRows(json.items ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports();
  }, []);

  const workers = Array.from(new Set(rows.map((row) => row.workerName))).sort();
  const sections = Array.from(new Set(rows.map((row) => row.section))).sort();

  const items = useMemo(
    () =>
      rows.filter((row) => {
        if (worker && row.workerName !== worker) return false;
        if (section && row.section !== section) return false;
        if (orderNo && !row.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
        if (from && row.reportDate < from) return false;
        if (to && row.reportDate > to) return false;
        return true;
      }),
    [rows, worker, section, orderNo, from, to],
  );

  const pendingItems = items.filter((item) => (item.status ?? 'PENDING') === 'PENDING');
  const reviewableItems = items.filter((item) => ['PENDING', 'REJECTED'].includes(item.status ?? 'PENDING'));

  const pendingCount = pendingItems.length;
  const acceptedTotal = statusTotal(items, 'ACCEPTED');
  const paidTotal = statusTotal(items, 'PAID');
  const rejectedCount = items.filter((item) => item.status === 'REJECTED').length;
  const workerTotal = items.reduce((acc, item) => acc + item.total, 0);
  const ordersCount = new Set(items.map((item) => item.orderNo)).size;

  async function acceptItem(item: ReportItem) {
    const res = await fetch(`/api/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.error ?? 'Ошибка принятия');
      return;
    }

    await loadReports();
  }

  async function rejectItem(item: ReportItem) {
    const comment = prompt('Причина отклонения', item.rejectComment ?? '');
    if (comment === null) return;

    if (!comment.trim()) {
      alert('Укажите причину отклонения');
      return;
    }

    const res = await fetch(`/api/reports/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', comment }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.error ?? 'Ошибка отклонения');
      return;
    }

    await loadReports();
  }

  async function acceptFilteredByWorker() {
    if (!worker) {
      alert('Сначала выберите работника');
      return;
    }

    if (reviewableItems.length === 0) {
      alert('По текущему фильтру нет работ на проверке или отклонённых работ.');
      return;
    }

    if (!confirm(`Принять все работы по текущему фильтру? Количество: ${reviewableItems.length}`)) {
      return;
    }

    const res = await fetch('/api/reports/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acceptFiltered',
        workerName: worker,
        section,
        orderNo,
        from,
        to,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.error ?? 'Ошибка массового принятия');
      return;
    }

    alert(`Принято работ: ${json.count ?? 0}`);
    await loadReports();
  }

  async function rejectFilteredByWorker() {
    if (!worker) {
      alert('Сначала выберите работника');
      return;
    }

    if (pendingItems.length === 0) {
      alert('По текущему фильтру нет работ со статусом «На проверке».');
      return;
    }

    const comment = prompt(`Причина отклонения для ${pendingItems.length} работ`);
    if (comment === null) return;

    if (!comment.trim()) {
      alert('Укажите причину отклонения');
      return;
    }

    if (!confirm(`Отклонить все работы по текущему фильтру? Количество: ${pendingItems.length}`)) {
      return;
    }

    const res = await fetch('/api/reports/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rejectFiltered',
        workerName: worker,
        section,
        orderNo,
        from,
        to,
        comment,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(json?.error ?? 'Ошибка массового отклонения');
      return;
    }

    alert(`Отклонено работ: ${json.count ?? 0}`);
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

  function resetFilters() {
    setWorker('');
    setOrderNo('');
    setSection('');
    setFrom('');
    setTo('');
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Отчёты" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Проверка работ
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Фильтруйте операции, принимайте работы, отклоняйте ошибки и готовьте принятые работы к выплате.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/payments"
                    className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                  >
                    Перейти к выплатам
                  </Link>

                  <button
                    onClick={loadReports}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Обновить
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Строк по фильтру</div>
                <div className="mt-2 text-3xl font-black">{items.length}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">На проверке</div>
                <div className="mt-2 text-3xl font-black">{pendingCount}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">К выплате</div>
                <div className="mt-2 text-3xl font-black">{acceptedTotal.toFixed(2)}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Оплачено</div>
                <div className="mt-2 text-3xl font-black">{paidTotal.toFixed(2)}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отклонено</div>
                <div className="mt-2 text-3xl font-black">{rejectedCount}</div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Фильтры</h2>
                  <p className="text-sm text-slate-500">
                    Заказов: {ordersCount} · сумма по фильтру: {workerTotal.toFixed(2)}
                  </p>
                </div>

                <button
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  onClick={resetFilters}
                >
                  Сбросить
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Работник</span>
                  <select className="input py-3" value={worker} onChange={(event) => setWorker(event.target.value)}>
                    <option value="">Все работники</option>
                    {workers.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Раздел</span>
                  <select className="input py-3" value={section} onChange={(event) => setSection(event.target.value)}>
                    <option value="">Все разделы</option>
                    {sections.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Заказ</span>
                  <input
                    className="input py-3"
                    placeholder="Номер заказа"
                    value={orderNo}
                    onChange={(event) => setOrderNo(event.target.value)}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">С</span>
                  <input className="input py-3" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">По</span>
                  <input className="input py-3" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black">Массовые действия</h2>
                  <p className="text-sm text-slate-500">
                    Массовые действия доступны только после выбора работника. Фильтры по заказу, разделу и периоду учитываются.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                    href={exportUrl('csv')}
                  >
                    CSV
                  </a>

                  <a
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                    href={exportUrl('print')}
                    target="_blank"
                  >
                    PDF / печать
                  </a>

                  <button
                    className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={acceptFilteredByWorker}
                    disabled={!worker || reviewableItems.length === 0}
                  >
                    Принять все по фильтру
                  </button>

                  <button
                    className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={rejectFilteredByWorker}
                    disabled={!worker || pendingItems.length === 0}
                  >
                    Отклонить все по фильтру
                  </button>
                </div>
              </div>

              {!worker && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Для массового принятия или отклонения сначала выберите работника.
                </div>
              )}

              {worker && pendingItems.length === 0 && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                  По текущему фильтру нет работ со статусом «На проверке» для массового отклонения.
                </div>
              )}
            </section>

            {loading ? (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                Загрузка...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                <div className="text-xl font-black">Работы не найдены</div>
                <p className="mt-2 text-sm text-slate-500">
                  Попробуйте изменить фильтры или сбросить их.
                </p>
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ReportsTable items={items} onAccept={acceptItem} onReject={rejectItem} />
              </div>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}