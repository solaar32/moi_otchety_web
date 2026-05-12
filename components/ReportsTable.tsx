'use client';

import type { ReportItem } from '@/lib/types';

type ReportsTableProps = {
  items: ReportItem[];
  showWorker?: boolean;
  showCustomer?: boolean;
  onEdit?: (item: ReportItem) => void;
  onDelete?: (item: ReportItem) => void;
  onAccept?: (item: ReportItem) => void;
  onReject?: (item: ReportItem) => void;
};

const statusLabels: Record<string, string> = {
  PENDING: 'На проверке',
  ACCEPTED: 'Принято',
  REJECTED: 'Отклонено',
  IN_PAYMENT: 'В выплате',
  PAID: 'Оплачено',
};

function isLocked(status?: string) {
  return status === 'IN_PAYMENT' || status === 'PAID';
}

export function ReportsTable({
  items,
  showWorker = true,
  showCustomer = false,
  onEdit,
  onDelete,
  onAccept,
  onReject,
}: ReportsTableProps) {
  const total = items.reduce((acc, item) => acc + item.total, 0);
  const customerTotal = items.reduce((acc, item) => acc + (item.customerTotal ?? 0), 0);
  const actions = Boolean(onEdit || onDelete || onAccept || onReject);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--brand-soft)] text-left">
            <tr>
              <th className="p-3">Дата</th>
              {showWorker && <th className="p-3">Работник</th>}
              <th className="p-3">Заказ</th>
              <th className="p-3">Раздел</th>
              <th className="p-3">Операция</th>
              <th className="p-3 text-right">Объем</th>
              <th className="p-3 text-right">Работнику</th>
              <th className="p-3">Статус</th>
              {showCustomer && <th className="p-3 text-right">Заказчику</th>}
              {actions && <th className="p-3 text-right">Действия</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const locked = isLocked(item.status);
              return (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="p-3">{item.reportDate}</td>
                  {showWorker && <td className="p-3">{item.workerName}</td>}
                  <td className="p-3">{item.orderNo}</td>
                  <td className="p-3">{item.section}</td>
                  <td className="p-3">
                    <div>{item.operation}</div>
                    {item.rejectComment && <div className="mt-1 text-xs text-red-600">Причина: {item.rejectComment}</div>}
                  </td>
                  <td className="p-3 text-right">{item.qty} {item.unit}</td>
                  <td className="p-3 text-right font-semibold">{item.total.toFixed(2)}</td>
                  <td className="p-3">{statusLabels[item.status ?? 'PENDING'] ?? item.status ?? 'На проверке'}</td>
                  {showCustomer && <td className="p-3 text-right">{item.customerTotal == null ? '-' : item.customerTotal.toFixed(2)}</td>}
                  {actions && (
                    <td className="p-3 text-right whitespace-nowrap">
                      {onAccept && item.status !== 'ACCEPTED' && item.status !== 'PAID' && (
                        <button className="text-xs font-semibold text-green-700" onClick={() => onAccept(item)}>
                          Принять
                        </button>
                      )}
                      {onReject && item.status !== 'REJECTED' && item.status !== 'PAID' && (
                        <button className="ml-3 text-xs font-semibold text-orange-600" onClick={() => onReject(item)}>
                          Отклонить
                        </button>
                      )}
                      {onEdit && !locked && (
                        <button className="ml-3 text-xs font-semibold text-[var(--brand)]" onClick={() => onEdit(item)}>
                          Изм.
                        </button>
                      )}
                      {onDelete && !locked && (
                        <button className="ml-3 text-xs font-semibold text-red-600" onClick={() => onDelete(item)}>
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
            <tr className="border-t border-[var(--line)] bg-slate-50 font-bold">
              <td className="p-3" colSpan={(showWorker ? 7 : 6)}>Итого</td>
              <td className="p-3 text-right">{total.toFixed(2)}</td>
              {showCustomer && <td className="p-3 text-right">{customerTotal.toFixed(2)}</td>}
              {actions && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
