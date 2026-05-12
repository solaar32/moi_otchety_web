import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

const statusLabels: Record<string, string> = {
  PENDING: 'На проверке',
  ACCEPTED: 'Принято',
  REJECTED: 'Отклонено',
  IN_PAYMENT: 'В выплате',
  PAID: 'Оплачено',
};

async function loadRows(url: URL) {
  const worker = url.searchParams.get('worker') ?? '';
  const section = url.searchParams.get('section') ?? '';
  const orderNo = url.searchParams.get('orderNo') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  const reports = await prisma.report.findMany({
    orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
    include: {
      worker: true,
      items: {
        orderBy: { id: 'desc' },
        include: { priceItem: { include: { category: true } } },
      },
    },
  });

  return reports.flatMap((report) => report.items.map((item) => {
    const customerPrice = item.priceItem.customerPrice;
    return {
      date: dateOnly(report.workDate),
      worker: report.worker.fullName,
      orderNo: report.orderNumber,
      section: item.priceItem.category.name,
      operation: item.operationName ?? item.priceItem.name,
      unit: item.priceItem.unit,
      qty: item.quantity,
      workerTotal: item.total,
      customerTotal: customerPrice == null ? null : customerPrice * item.quantity,
      status: statusLabels[item.status] ?? item.status,
      rejectComment: item.rejectComment ?? '',
    };
  })).filter((row) => {
    if (worker && row.worker !== worker) return false;
    if (section && row.section !== section) return false;
    if (orderNo && !row.orderNo.toLowerCase().includes(orderNo.toLowerCase())) return false;
    if (from && row.date < from) return false;
    if (to && row.date > to) return false;
    return true;
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'csv';
  const rows = await loadRows(url);
  const workerTotal = rows.reduce((acc, row) => acc + row.workerTotal, 0);
  const customerTotal = rows.reduce((acc, row) => acc + (row.customerTotal ?? 0), 0);

  if (format === 'print') {
    const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/><title>Отчет</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d1d5db;padding:6px;text-align:left}th{background:#eef7fb}.right{text-align:right}.muted{color:#6b7280}@media print{button{display:none}}</style>
</head><body>
<button onclick="window.print()">Печать / сохранить PDF</button>
<h1>Отчет по работам</h1>
<p class="muted">Сформировано: ${new Date().toLocaleString('ru-RU')}</p>
<p><b>Строк:</b> ${rows.length} &nbsp; <b>Работникам:</b> ${workerTotal.toFixed(2)} &nbsp; <b>Заказчику:</b> ${customerTotal.toFixed(2)}</p>
<table><thead><tr><th>Дата</th><th>Работник</th><th>Заказ</th><th>Раздел</th><th>Операция</th><th>Объем</th><th>Работнику</th><th>Заказчику</th><th>Статус</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.date}</td><td>${r.worker}</td><td>${r.orderNo}</td><td>${r.section}</td><td>${r.operation}</td><td class="right">${r.qty} ${r.unit}</td><td class="right">${r.workerTotal.toFixed(2)}</td><td class="right">${r.customerTotal == null ? '-' : r.customerTotal.toFixed(2)}</td><td>${r.status}</td></tr>`).join('')}
</tbody></table></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const header = ['Дата', 'Работник', 'Заказ', 'Раздел', 'Операция', 'Ед.', 'Объем', 'Сумма работнику', 'Сумма заказчику', 'Статус', 'Причина отклонения'];
  const lines = [header.map(csvCell).join(';')];
  for (const row of rows) {
    lines.push([
      row.date, row.worker, row.orderNo, row.section, row.operation, row.unit, row.qty,
      row.workerTotal.toFixed(2), row.customerTotal == null ? '' : row.customerTotal.toFixed(2), row.status, row.rejectComment,
    ].map(csvCell).join(';'));
  }
  lines.push(['', '', '', '', '', '', 'Итого', workerTotal.toFixed(2), customerTotal.toFixed(2), '', ''].map(csvCell).join(';'));

  return new NextResponse('\ufeff' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="moi-otchety-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
