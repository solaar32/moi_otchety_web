'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION_LABEL } from '@/lib/app-info';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { ReportItem } from '@/lib/types';

function statusTotal(rows: ReportItem[], status: string) {
  return rows
    .filter((row) => row.status === status)
    .reduce((acc, row) => acc + row.total, 0);
}

export default function AdminPage() {
  const [rows, setRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((j) => setRows(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((acc, row) => acc + row.total, 0);
  const pendingRows = rows.filter((row) => (row.status ?? 'PENDING') === 'PENDING');
  const acceptedTotal = statusTotal(rows, 'ACCEPTED');
  const paidTotal = statusTotal(rows, 'PAID');

  const workersCount = useMemo(
    () => new Set(rows.map((row) => row.workerName)).size,
    [rows],
  );

  const latestRows = rows.slice(0, 6);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Панель работодателя" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500">
                    {APP_VERSION_LABEL}
                  </div>

                  <h1 className="mt-1 text-3xl font-black text-slate-900">
                    Рабочий центр
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Контроль работ, проверка операций, прайсы, выплаты, безопасность и резервные копии.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/reports"
                    className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white shadow-sm"
                  >
                    Проверить работы
                  </Link>

                  <Link
                    href="/admin/payments"
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Выплаты
                  </Link>

                  <Link
                    href="/admin/prices"
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Загрузить прайс
                  </Link>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Всего в отчётах</div>
                <div className="mt-2 text-3xl font-black">{total.toFixed(2)}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">На проверке</div>
                <div className="mt-2 text-3xl font-black">{pendingRows.length}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {statusTotal(rows, 'PENDING').toFixed(2)}
                </div>
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
                <div className="text-sm text-slate-500">Работников</div>
                <div className="mt-2 text-3xl font-black">{workersCount}</div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Работы на проверке</h2>
                    <p className="text-sm text-slate-500">
                      Последние операции, которые требуют решения работодателя.
                    </p>
                  </div>

                  <Link
                    href="/admin/reports"
                    className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                  >
                    Открыть все
                  </Link>
                </div>

                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Загрузка...
                  </div>
                ) : pendingRows.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    Нет работ на проверке.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingRows.slice(0, 6).map((row) => (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-black">
                              {row.workerName} · заказ {row.orderNo}
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              {row.operation}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {row.reportDate} · {row.qty} {row.unit}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 md:block md:text-right">
                            <div className="text-lg font-black">
                              {row.total.toFixed(2)}
                            </div>

                            <Link
                              href="/admin/reports"
                              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                            >
                              Проверить
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-black">Быстрые разделы</h2>

                  <div className="mt-4 grid gap-2">
                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/reports">
                      Отчёты и фильтры
                    </Link>

                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/payments">
                      Выплаты работникам
                    </Link>

                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/workers">
                      Работники и пароли
                    </Link>

                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/prices">
                      Прайс Excel
                    </Link>

                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/security">
                      Безопасность
                    </Link>

                    <Link className="rounded-2xl bg-slate-50 p-4 font-black hover:bg-slate-100" href="/admin/backup">
                      Backup
                    </Link>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-black">Последние операции</h2>

                  <div className="mt-4 space-y-2">
                    {latestRows.length === 0 ? (
                      <div className="text-sm text-slate-500">Пока нет операций.</div>
                    ) : (
                      latestRows.map((row) => (
                        <div key={row.id} className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex justify-between gap-3">
                            <div>
                              <div className="text-sm font-black">
                                {row.workerName}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {row.operation}
                              </div>
                            </div>

                            <div className="text-right text-sm font-black">
                              {row.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black">Выплаты работникам</h2>

                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Формируйте ведомости по принятым и неоплаченным работам за выбранный период.
                    Следующий этап v23 — улучшенный сценарий выплат через черновики ведомостей.
                  </p>
                </div>

                <Link
                  className="rounded-2xl bg-[var(--brand)] px-5 py-3 text-center font-black text-white"
                  href="/admin/payments"
                >
                  Перейти к выплатам
                </Link>
              </div>
            </section>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}