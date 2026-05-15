'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { Payment } from '@/lib/types';

type PaymentWithArchive = Payment & {
  archived?: boolean;
  archivedAt?: string | null;
};

function rub(value: number) {
  return `${value.toFixed(2)} ₽`;
}

function statusLabel(status: string) {
  if (status === 'PAID') return 'Оплачено';
  if (status === 'CANCELED') return 'Отменена';
  return 'Черновик';
}

export default function AdminPaymentsArchivePage() {
  const [payments, setPayments] = useState<PaymentWithArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);

    const res = await fetch('/api/payments');
    const json = await res.json().catch(() => ({}));

    setPayments((json.payments ?? []).filter((payment: PaymentWithArchive) => payment.archived));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function restorePayment(id: string) {
    if (!confirm('Вернуть ведомость из архива в активные выплаты?')) return;

    setMessage('');

    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? 'Не удалось вернуть ведомость');
      return;
    }

    setMessage('Ведомость возвращена из архива');
    await load();
  }

  const total = useMemo(
    () => payments.reduce((acc, payment) => acc + payment.total, 0),
    [payments],
  );

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Архив ведомостей" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Архив ведомостей
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Здесь хранятся оплаченные ведомости, отправленные в архив. Их можно открыть, распечатать или вернуть в активные выплаты.
                  </p>
                </div>

                <Link
                  href="/admin/payments"
                  className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                >
                  Вернуться к выплатам
                </Link>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">В архиве</div>
                <div className="mt-2 text-3xl font-black">{payments.length}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Сумма архива</div>
                <div className="mt-2 text-3xl font-black">{rub(total)}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Статус</div>
                <div className="mt-2 text-3xl font-black">Архив</div>
              </div>
            </section>

            {message && (
              <div className="rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                Загрузка...
              </div>
            ) : payments.length === 0 ? (
              <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                <div className="text-xl font-black">Архив ведомостей пуст</div>
                <p className="mt-2 text-sm text-slate-500">
                  Оплаченные ведомости появятся здесь после отправки в архив.
                </p>
              </div>
            ) : (
              <section className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-[2rem] bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">
                            Ведомость №{payment.id}
                          </h3>

                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                            Архив · {statusLabel(payment.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          Период: {payment.periodFrom} — {payment.periodTo}
                        </p>

                        {payment.paidAt && (
                          <p className="mt-1 text-sm text-slate-500">
                            Дата оплаты: {new Date(payment.paidAt).toLocaleString('ru-RU')}
                          </p>
                        )}

                        {payment.archivedAt && (
                          <p className="mt-1 text-sm text-slate-500">
                            В архиве с: {new Date(payment.archivedAt).toLocaleString('ru-RU')}
                          </p>
                        )}
                      </div>

                      <div className="lg:text-right">
                        <div className="text-sm text-slate-500">Итого</div>
                        <div className="text-3xl font-black">{rub(payment.total)}</div>

                        <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                          <a
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                            href={`/api/exports/payments/${payment.id}?format=csv`}
                          >
                            CSV
                          </a>

                          <a
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
                            href={`/api/exports/payments/${payment.id}?format=print`}
                            target="_blank"
                          >
                            PDF / печать
                          </a>

                          <button
                            className="rounded-2xl bg-[var(--brand)] px-4 py-2 text-sm font-black text-white"
                            onClick={() => restorePayment(payment.id)}
                          >
                            Вернуть
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {payment.lines.map((line) => (
                        <div key={line.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                          <div className="font-black">{line.workerName}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Операций: {line.itemsCount}
                          </div>

                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Работы</span>
                              <b>{rub(line.worksTotal)}</b>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-slate-500">Коррекция</span>
                              <b>{rub(line.adjustment)}</b>
                            </div>

                            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                              <span className="font-bold">К выплате</span>
                              <b>{rub(line.finalTotal)}</b>
                            </div>

                            {line.note && (
                              <div className="rounded-2xl bg-white p-3 text-xs text-slate-500">
                                {line.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}