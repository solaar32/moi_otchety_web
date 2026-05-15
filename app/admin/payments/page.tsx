'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { Payment } from '@/lib/types';

type WorkerOption = {
  id: string;
  fullName: string;
  login: string;
  active: boolean;
};

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

function statusClass(status: string) {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-700';
  if (status === 'CANCELED') return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

export default function AdminPaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [payments, setPayments] = useState<PaymentWithArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);

    const [paymentsRes, workersRes] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/workers'),
    ]);

    const paymentsJson = await paymentsRes.json().catch(() => ({}));
    const workersJson = await workersRes.json().catch(() => ({}));

    setPayments((paymentsJson.payments ?? []).filter((payment: PaymentWithArchive) => !payment.archived));
    setWorkers((workersJson.workers ?? []).filter((worker: WorkerOption) => worker.login !== 'admin'));

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPayment() {
    setMessage('');

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, workerId: workerId || null }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? 'Не удалось создать ведомость');
      return;
    }

    setMessage('Черновик ведомости создан');
    await load();
  }

  async function updatePayment(id: string, action: 'markPaid' | 'cancel' | 'archive') {
    const text =
      action === 'cancel'
        ? 'Отменить ведомость? Работы вернутся в статус «Принято» и смогут войти в новую выплату.'
        : action === 'archive'
          ? 'Отправить оплаченную ведомость в архив?'
          : 'Отметить ведомость оплаченной? Работы получат статус «Оплачено».';

    if (!confirm(text)) return;

    setMessage('');

    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? 'Ошибка операции');
      return;
    }

    if (action === 'archive') {
      setMessage('Ведомость отправлена в архив');
    }

    await load();
  }

  async function deletePayment(id: string) {
    if (!confirm('Удалить ведомость из журнала? Работы вернутся в статус «Принято». Оплаченные ведомости удалить нельзя.')) {
      return;
    }

    setMessage('');

    const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? 'Ошибка удаления ведомости');
      return;
    }

    await load();
  }

  async function editLine(paymentId: string, line: Payment['lines'][number]) {
    const adjustmentRaw = prompt(
      'Коррекция (+ премия / - аванс или штраф)',
      String(line.adjustment).replace('.', ','),
    );

    if (adjustmentRaw === null) return;

    const note = prompt('Примечание к коррекции', line.note ?? '');
    if (note === null) return;

    const res = await fetch(`/api/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateLine',
        lineId: line.id,
        adjustment: adjustmentRaw,
        note,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data.error ?? 'Ошибка редактирования строки ведомости');
      return;
    }

    await load();
  }

  const draftPayments = payments.filter((payment) => payment.status === 'CREATED');
  const paidPayments = payments.filter((payment) => payment.status === 'PAID');
  const canceledPayments = payments.filter((payment) => payment.status === 'CANCELED');

  const draftTotal = useMemo(
    () => draftPayments.reduce((acc, payment) => acc + payment.total, 0),
    [draftPayments],
  );

  const paidTotal = useMemo(
    () => paidPayments.reduce((acc, payment) => acc + payment.total, 0),
    [paidPayments],
  );

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Выплаты" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Ведомости выплат
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Создавайте черновики выплат, проверяйте суммы, закрывайте оплату и отправляйте оплаченные ведомости в архив.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                    href="/admin/payments/archive"
                  >
                    Архив ведомостей
                  </Link>

                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                    Черновик → Оплачено → Архив
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Активных ведомостей</div>
                <div className="mt-2 text-3xl font-black">{payments.length}</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">В черновиках</div>
                <div className="mt-2 text-3xl font-black">{rub(draftTotal)}</div>
                <div className="mt-1 text-xs text-slate-400">{draftPayments.length} ведом.</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Оплачено</div>
                <div className="mt-2 text-3xl font-black">{rub(paidTotal)}</div>
                <div className="mt-1 text-xs text-slate-400">{paidPayments.length} ведом.</div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Отменено</div>
                <div className="mt-2 text-3xl font-black">{canceledPayments.length}</div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Создать черновик</h2>

                <p className="mt-1 text-sm text-slate-500">
                  В черновик попадут только принятые и ещё не оплаченные работы.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">Период с</span>
                    <input className="input py-3" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">Период по</span>
                    <input className="input py-3" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-sm font-bold text-slate-700">Работник</span>
                    <select className="input py-3" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
                      <option value="">Все работники</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.fullName} ({worker.login})
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="w-full rounded-2xl bg-[var(--brand)] px-4 py-4 text-lg font-black text-white shadow-sm"
                    onClick={createPayment}
                  >
                    Создать черновик ведомости
                  </button>

                  {message && (
                    <div className="rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                      {message}
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-800">Правила</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Оплаченные ведомости можно отправлять в архив.</li>
                    <li>Отмена возвращает работы в «Принято».</li>
                    <li>Удалить можно только неоплаченную ведомость.</li>
                    <li>Коррекции можно делать до оплаты.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                {loading ? (
                  <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                    Загрузка...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
                    <div className="text-xl font-black">Активных ведомостей нет</div>
                    <p className="mt-2 text-sm text-slate-500">
                      Создайте первый черновик или откройте архив ведомостей.
                    </p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`rounded-[2rem] bg-white p-5 shadow-sm ${
                        payment.status === 'CANCELED' ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black">Ведомость №{payment.id}</h3>

                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(payment.status)}`}>
                              {statusLabel(payment.status)}
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
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {payment.lines.map((line) => (
                          <div key={line.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-black">{line.workerName}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Операций: {line.itemsCount}
                                </div>
                              </div>

                              {payment.status === 'CREATED' && (
                                <button
                                  className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[var(--brand)] shadow-sm"
                                  onClick={() => editLine(payment.id, line)}
                                >
                                  Ред.
                                </button>
                              )}
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

                      <div className="mt-4 flex flex-wrap gap-2">
                        {payment.status === 'CREATED' && (
                          <button
                            className="rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-black text-white"
                            onClick={() => updatePayment(payment.id, 'markPaid')}
                          >
                            Отметить оплачено
                          </button>
                        )}

                        {payment.status !== 'CANCELED' && (
                          <button
                            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                            onClick={() => updatePayment(payment.id, 'cancel')}
                          >
                            Отменить
                          </button>
                        )}

                        {payment.status === 'PAID' && (
                          <button
                            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                            onClick={() => updatePayment(payment.id, 'archive')}
                          >
                            В архив
                          </button>
                        )}

                        {payment.status !== 'PAID' && (
                          <button
                            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                            onClick={() => deletePayment(payment.id)}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}