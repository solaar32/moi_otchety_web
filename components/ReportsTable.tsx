'use client';

import type { ReportItem } from '@/lib/types';

type ReportsTableProps = {
  items: ReportItem[];
  showWorker?: boolean;
  showCustomer?: boolean;
  onEdit?: (item: ReportItem) => void;
  onDelete?: (item: ReportItem) => void;
};

export function ReportsTable({
  items,
  showWorker = true,
  showCustomer = false,
  onEdit,
  onDelete,
}: ReportsTableProps) {
  const total = items.reduce((acc, item) => acc + item.total, 0);
  const customerTotal = items.reduce((acc, item) => acc + (item.customerTotal ?? 0), 0);
  const actions = Boolean(onEdit || onDelete);

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
              {showCustomer && <th className="p-3 text-right">Заказчику</th>}
              {actions && <th className="p-3 text-right">Действия</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--line)]">
                <td className="p-3">{item.reportDate}</td>
                {showWorker && <td className="p-3">{item.workerName}</td>}
                <td className="p-3">{item.orderNo}</td>
                <td className="p-3">{item.section}</td>
                <td className="p-3">{item.operation}</td>
                <td className="p-3 text-right">{item.qty} {item.unit}</td>
                <td className="p-3 text-right font-semibold">{item.total.toFixed(2)}</td>
                {showCustomer && <td className="p-3 text-right">{item.customerTotal == null ? '-' : item.customerTotal.toFixed(2)}</td>}
                {actions && (
                  <td className="p-3 text-right whitespace-nowrap">
                    {onEdit && (
                      <button className="text-xs font-semibold text-[var(--brand)]" onClick={() => onEdit(item)}>
                        Изм.
                      </button>
                    )}
                    {onDelete && (
                      <button className="ml-3 text-xs font-semibold text-red-600" onClick={() => onDelete(item)}>
                        Удалить
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--line)] bg-slate-50 font-bold">
              <td className="p-3" colSpan={(showWorker ? 6 : 5)}>Итого</td>
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
