'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { Payment } from '@/lib/types';

type WorkerOption = { id: string; fullName: string; login: string; active: boolean };

function rub(value: number) {
  return `${value.toFixed(2)} ₽`;
}

function statusLabel(status: string) {
  if (status === 'PAID') return 'Оплачено';
  if (status === 'CANCELED') return 'Отменена';
  return 'Создана';
}

export default function AdminPaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
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
    setPayments(paymentsJson.payments ?? []);
    setWorkers((workersJson.workers ?? []).filter((w: WorkerOption) => w.login !== 'admin'));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createPayment() {
    setMessage('');
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, workerId: workerId || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? 'Не удалось создать выплату');
      return;
    }
    setMessage('Выплата создана');
    await load();
  }

  async function updatePayment(id: string, action: 'markPaid' | 'cancel') {
    const text = action === 'cancel'
      ? 'Отменить выплату? Работы вернутся в статус «Принято» и смогут войти в новую выплату.'
      : 'Отметить выплату оплаченной? Работы получат статус «Оплачено».';
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
    await load();
  }

  async function editLine(paymentId: string, line: Payment['lines'][number]) {
    const adjustmentRaw = prompt('Коррекция (+ премия / - аванс или штраф)', String(line.adjustment).replace('.', ','));
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
      setMessage(data.error ?? 'Ошибка редактирования строки выплаты');
      return;
    }
    await load();
  }

  const createdTotal = useMemo(() => payments.filter((p) => p.status === 'CREATED').reduce((acc, p) => acc + p.total, 0), [payments]);
  const paidTotal = useMemo(() => payments.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.total, 0), [payments]);
  const canceledTotal = useMemo(() => payments.filter((p) => p.status === 'CANCELED').length, [payments]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Выплаты" role="Работодатель">
          <div className="grid gap-3 md:grid-cols-4 mb-4">
            <div className="card p-4"><div className="text-sm text-slate-500">Ведомостей</div><div className="text-2xl font-bold">{payments.length}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">К выплате</div><div className="text-2xl font-bold">{rub(createdTotal)}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">Оплачено</div><div className="text-2xl font-bold">{rub(paidTotal)}</div></div>
            <div className="card p-4"><div className="text-sm text-slate-500">Отменено</div><div className="text-2xl font-bold">{canceledTotal}</div></div>
          </div>

          <div className="card p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">Сформировать выплату</h2>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto]">
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <select className="input" value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
                <option value="">Все работники</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.fullName} ({w.login})</option>)}
              </select>
              <button className="btn" onClick={createPayment}>Сформировать</button>
            </div>
            <p className="mt-2 text-sm text-slate-500">Можно сформировать выплату по всем работникам или только по выбранному работнику. В выплату попадают только принятые и ещё не оплаченные работы.</p>
            {message && <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold">{message}</div>}
          </div>

          {loading ? <div className="card p-4">Загрузка...</div> : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className={`card p-4 ${payment.status === 'CANCELED' ? 'opacity-70' : ''}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Выплата №{payment.id}</h3>
                      <p className="text-sm text-slate-500">Период: {payment.periodFrom} — {payment.periodTo}</p>
                      <p className="text-sm text-slate-500">Статус: <b>{statusLabel(payment.status)}</b></p>
                      {payment.paidAt && <p className="text-sm text-slate-500">Дата оплаты: {new Date(payment.paidAt).toLocaleString('ru-RU')}</p>}
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-sm text-slate-500">Итого</div>
                      <div className="text-2xl font-bold">{rub(payment.total)}</div>
                      <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                        <a className="btn-secondary" href={`/api/exports/payments/${payment.id}?format=csv`}>CSV</a>
                        <a className="btn-secondary" href={`/api/exports/payments/${payment.id}?format=print`} target="_blank">PDF / печать</a>
                      </div>
                      {payment.status !== 'CANCELED' && (
                        <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                          {payment.status !== 'PAID' && <button className="btn" onClick={() => updatePayment(payment.id, 'markPaid')}>Отметить оплачено</button>}
                          <button className="btn-secondary" onClick={() => updatePayment(payment.id, 'cancel')}>Отменить выплату</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--brand-soft)] text-left">
                        <tr>
                          <th className="p-3">Работник</th>
                          <th className="p-3 text-right">Операций</th>
                          <th className="p-3 text-right">Работы</th>
                          <th className="p-3 text-right">Коррекция</th>
                          <th className="p-3 text-right">К выплате</th>
                          <th className="p-3">Примечание</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {payment.lines.map((line) => (
                          <tr key={line.id} className="border-t border-[var(--line)]">
                            <td className="p-3 font-semibold">{line.workerName}</td>
                            <td className="p-3 text-right">{line.itemsCount}</td>
                            <td className="p-3 text-right">{rub(line.worksTotal)}</td>
                            <td className="p-3 text-right">{rub(line.adjustment)}</td>
                            <td className="p-3 text-right font-bold">{rub(line.finalTotal)}</td>
                            <td className="p-3">{line.note ?? '-'}</td>
                            <td className="p-3 text-right">
                              {payment.status === 'CREATED' && <button className="text-xs font-semibold text-[var(--brand)]" onClick={() => editLine(payment.id, line)}>Ред.</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <div className="card p-4">Выплат пока нет.</div>}
            </div>
          )}
        </AppShell>
      )}
    </RequireUser>
  );
}
