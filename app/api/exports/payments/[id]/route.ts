import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const { id } = await params;
  const paymentId = Number(id);
  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'csv';

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      lines: { orderBy: { workerName: 'asc' }, include: { items: true } },
    },
  });
  if (!payment) return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 });

  if (format === 'print') {
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"/><title>Выплата №${payment.id}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #d1d5db;padding:7px;text-align:left}th{background:#eef7fb}.right{text-align:right}.muted{color:#6b7280}@media print{button{display:none}}</style></head><body>
<button onclick="window.print()">Печать / сохранить PDF</button>
<h1>Ведомость выплаты №${payment.id}</h1>
<p class="muted">Период: ${dateOnly(payment.periodFrom)} — ${dateOnly(payment.periodTo)} · Статус: ${payment.status}</p>
<table><thead><tr><th>Работник</th><th class="right">Работы</th><th class="right">Коррекция</th><th class="right">К выплате</th><th class="right">Операций</th><th>Примечание</th></tr></thead><tbody>
${payment.lines.map((l) => `<tr><td>${l.workerName}</td><td class="right">${l.worksTotal.toFixed(2)}</td><td class="right">${l.adjustment.toFixed(2)}</td><td class="right"><b>${l.finalTotal.toFixed(2)}</b></td><td class="right">${l.items.length}</td><td>${l.note ?? ''}</td></tr>`).join('')}
</tbody></table><h2>Итого: ${payment.total.toFixed(2)}</h2></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const lines = [['Работник', 'Работы', 'Коррекция', 'К выплате', 'Операций', 'Примечание'].map(csvCell).join(';')];
  for (const line of payment.lines) {
    lines.push([line.workerName, line.worksTotal.toFixed(2), line.adjustment.toFixed(2), line.finalTotal.toFixed(2), line.items.length, line.note ?? ''].map(csvCell).join(';'));
  }
  lines.push(['Итого', '', '', payment.total.toFixed(2), '', ''].map(csvCell).join(';'));

  return new NextResponse('\ufeff' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payment-${payment.id}.csv"`,
    },
  });
}
