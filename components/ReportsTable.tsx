'use client';

import type { ReportItem } from '@/lib/types';

type ReportsTableProps = {
  items: ReportItem[];
  showWorker?: boolean;
  onEdit?: (item: ReportItem) => void;
  onDelete?: (item: ReportItem) => void;
  onAccept?: (item: ReportItem) => void;
  onReject?: (item: ReportItem) => void;
};

const statusMeta: Record<string, { label: string; className: string; rowClassName: string }> = {
  PENDING: {
    label: 'На проверке',
    className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    rowClassName: 'bg-amber-50/35',
  },
  ACCEPTED: {
    label: 'Принято',
    className: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    rowClassName: 'bg-emerald-50/30',
  },
  REJECTED: {
    label: 'Отклонено',
    className: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    rowClassName: 'bg-red-50/35',
  },
  IN_PAYMENT: {
    label: 'В выплате',
    className: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
    rowClassName: 'bg-violet-50/30',
  },
  PAID: {
    label: 'Оплачено',
    className: 'bg-slate-800 text-white ring-1 ring-slate-700',
    rowClassName: 'bg-slate-50 text-slate-500',
  },
};

function getStatusMeta(status?: string) {
  return statusMeta[status ?? 'PENDING'] ?? {
    label: status ?? 'На проверке',
    className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    rowClassName: '',
  };
}

function isLocked(status?: string) {
  return status === 'IN_PAYMENT' || status === 'PAID';
}

export function ReportsTable({
  items,
  showWorker = true,
  onEdit,
  onDelete,
  onAccept,
  onReject,
}: ReportsTableProps) {
  const total = items.reduce((acc, item) => acc + item.total, 0);
  const actions = Boolean(onEdit || onDelete || onAccept || onReject);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-[var(--brand-soft)] text-left">
            <tr>
              <th className="p-3">Дата</th>
              {showWorker && <th className="p-3">Работник</th>}
              <th className="p-3">Заказ</th>
              <th className="p-3">Раздел</th>
              <th className="p-3">Операция</th>
              <th className="p-3 text-right">Объём</th>
              <th className="p-3 text-right">Работнику</th>
              <th className="p-3">Статус</th>
              {actions && <th className="p-3 text-right">Действия</th>}
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const locked = isLocked(item.status);
              const meta = getStatusMeta(item.status);

              return (
                <tr
                  key={item.id}
                  className={`border-t border-[var(--line)] transition hover:bg-slate-100 ${meta.rowClassName}`}
                >
                  <td className="p-3 whitespace-nowrap">{item.reportDate}</td>

                  {showWorker && (
                    <td className="p-3 font-semibold text-slate-800">
                      {item.workerName}
                    </td>
                  )}

                  <td className="p-3 font-bold text-slate-900">{item.orderNo}</td>
                  <td className="p-3 text-slate-600">{item.section}</td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{item.operation}</div>

                    {item.rejectComment && (
                      <div className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
                        Причина: {item.rejectComment}
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    {item.qty} {item.unit}
                  </td>

                  <td className="p-3 text-right font-black whitespace-nowrap">
                    {item.total.toFixed(2)}
                  </td>

                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>
                      {meta.label}
                    </span>
                  </td>

                  {actions && (
                    <td className="p-3 text-right whitespace-nowrap">
                      {onAccept && item.status !== 'ACCEPTED' && item.status !== 'IN_PAYMENT' && item.status !== 'PAID' && (
                        <button
                          className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700"
                          onClick={() => onAccept(item)}
                        >
                          Принять
                        </button>
                      )}

                      {onReject && item.status !== 'REJECTED' && item.status !== 'IN_PAYMENT' && item.status !== 'PAID' && (
                        <button
                          className="ml-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700"
                          onClick={() => onReject(item)}
                        >
                          Отклонить
                        </button>
                      )}

                      {onEdit && !locked && (
                        <button
                          className="ml-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-[var(--brand)]"
                          onClick={() => onEdit(item)}
                        >
                          Изм.
                        </button>
                      )}

                      {onDelete && !locked && (
                        <button
                          className="ml-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                          onClick={() => onDelete(item)}
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t border-[var(--line)] bg-slate-50 font-black">
              <td className="p-3" colSpan={showWorker ? 6 : 5}>
                Итого
              </td>
              <td className="p-3 text-right">{total.toFixed(2)}</td>
              <td />
              {actions && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}