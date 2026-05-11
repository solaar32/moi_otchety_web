'use client';

import type { ReportItem } from '@/lib/types';

export function ReportsTable({ items }: { items: ReportItem[] }) {
  const total = items.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--brand-soft)] text-left">
            <tr>
              <th className="p-3">Дата</th>
              <th className="p-3">Работник</th>
              <th className="p-3">Заказ</th>
              <th className="p-3">Раздел</th>
              <th className="p-3">Операция</th>
              <th className="p-3 text-right">Объем</th>
              <th className="p-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--line)]">
                <td className="p-3">{item.reportDate}</td>
                <td className="p-3">{item.workerName}</td>
                <td className="p-3">{item.orderNo}</td>
                <td className="p-3">{item.section}</td>
                <td className="p-3">{item.operation}</td>
                <td className="p-3 text-right">{item.qty} {item.unit}</td>
                <td className="p-3 text-right font-semibold">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--line)] bg-slate-50 font-bold">
              <td className="p-3" colSpan={6}>Итого</td>
              <td className="p-3 text-right">{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
