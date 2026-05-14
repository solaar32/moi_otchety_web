'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import { ReportsTable } from '@/components/ReportsTable';
import type { ReportItem } from '@/lib/types';

export default function AdminArchivePage() {
  const [worker, setWorker] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
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

  const workers = Array.from(new Set(rows.map((row) => row.workerName))).sort();
  const sections = Array.from(new Set(rows.map((row) => row.section))).sort();

  const items = useMemo(() => {
    return rows.filter((row) => {
      if (worker && row.workerName !== worker) return false;
      if (section && row.section !== section) return false;
      if (status && (row.status ?? 'PENDING') !== status) return false;
      if (orderNo && !row.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
      if (from && row.reportDate < from) return false;
      if (to && row.reportDate > to) return false;
      return true;
    });
  }, [rows, worker, section, status, orderNo, from, to]);

  const total = items.reduce((acc, item) => acc + item.total, 0);
  const ordersCount = new Set(items.map((item) => item.orderNo)).size;

  function resetFilters() {
    setWorker('');
    setOrderNo('');
    setSection('');
    setStatus('');
    setFrom('');
    setTo('');
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
        <AppShell title="Архив работ" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Архив всех работ
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Полная история операций с фильтрами, выгрузкой и печатью по выбранному периоду.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/reports"
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Проверка работ
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

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Работ по фильтру</div>
                <div className="mt-2 text-3xl font-black">{items.length}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Заказов</div>
                <div className="mt-2 text-3xl font-black">{ordersCount}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Сумма</div>
                <div className="mt-2 text-3xl font-black">{total.toFixed(2)}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего в базе</div>
                <div className="mt-2 text-3xl font-black">{rows.length}</div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">Фильтры архива</h2>
                  <p className="text-sm text-slate-500">
                    Можно отфильтровать архив по работнику, заказу, разделу, статусу и датам.
                  </p>
                </div>

                <button
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  onClick={resetFilters}
                >
                  Сбросить
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Работник</span>
                  <select className="input py-3" value={worker} onChange={(event) => setWorker(event.target.value)}>
                    <option value="">Все</option>
                    {workers.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Раздел</span>
                  <select className="input py-3" value={section} onChange={(event) => setSection(event.target.value)}>
                    <option value="">Все</option>
                    {sections.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Статус</span>
                  <select className="input py-3" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">Все</option>
                    <option value="PENDING">На проверке</option>
                    <option value="ACCEPTED">Принято</option>
                    <option value="REJECTED">Отклонено</option>
                    <option value="PAID">Оплачено</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-bold text-slate-700">Заказ</span>
                  <input
                    className="input py-3"
                    placeholder="Номер"
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
                  <h2 className="text-xl font-black">Выгрузка</h2>
                  <p className="text-sm text-slate-500">
                    Экспорт и печать применяются к текущему фильтру.
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
                    className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                    href={exportUrl('print')}
                    target="_blank"
                  >
                    PDF / печать
                  </a>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                Загрузка...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                <div className="text-xl font-black">В архиве ничего не найдено</div>
                <p className="mt-2 text-sm text-slate-500">
                  Попробуйте изменить фильтры или сбросить их.
                </p>
              </div>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ReportsTable items={items} />
              </div>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}