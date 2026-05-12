'use client';

import Link from 'next/link';
import { APP_VERSION_LABEL } from '@/lib/app-info';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';
import type { ReportItem } from '@/lib/types';

export default function AdminPage() {
  const [rows, setRows] = useState<ReportItem[]>([]);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((j) => setRows(j.items ?? []));
  }, []);

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  const workersCount = useMemo(() => new Set(rows.map((r) => r.workerName)).size, [rows]);

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Панель работодателя" role="Работодатель">
          <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-slate-600">
            Версия сайта: <b>{APP_VERSION_LABEL}</b>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="text-sm text-slate-500">Сумма в отчетах</div>
              <div className="mt-2 text-3xl font-bold">{total.toFixed(2)}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Работников с отчетами</div>
              <div className="mt-2 text-3xl font-bold">{workersCount}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-slate-500">Операций</div>
              <div className="mt-2 text-3xl font-bold">{rows.length}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/reports">Отчеты и фильтры</Link>
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/workers">Работники</Link>
            <Link className="card p-5 font-bold hover:border-[var(--brand)]" href="/admin/prices">Прайс Excel</Link>
            <div className="card p-5 font-bold text-slate-400" title="Будет добавлено следующим этапом">Выплаты</div>
          </div>
          <div className="card p-4 mt-4">
            <h2 className="text-lg font-bold">Выплаты работникам</h2>
            <p className="mt-1 text-sm text-slate-500">Формируйте ведомости по неоплаченным работам за выбранный период.</p>
            <a className="btn mt-3 inline-flex" href="/admin/payments">Перейти к выплатам</a>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
