import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function getReportRows(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return [];

  const reports = await prisma.report.findMany({
    where: user.role === 'worker' ? { workerId: Number(user.id) } : undefined,
    orderBy: { workDate: 'desc' },
    include: {
      worker: true,
      items: {
        include: {
          priceItem: {
            include: { category: true },
          },
        },
      },
    },
  });

  return reports.flatMap((report) => report.items.map((item) => ({
    id: String(item.id),
    reportDate: formatDate(report.workDate),
    workerName: report.worker.fullName,
    orderNo: report.orderNumber,
    section: item.priceItem.category.name,
    operation: item.priceItem.name,
    unit: item.priceItem.unit,
    qty: item.quantity,
    price: item.price,
    total: item.total,
  })));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const items = await getReportRows(user);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'worker') return NextResponse.json({ error: 'Только работник может создавать отчет' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const workDate = String(body?.workDate ?? '').trim();
  const orderNumber = String(body?.orderNumber ?? '').trim();
  const priceItemId = Number(body?.priceItemId);
  const quantity = Number(String(body?.quantity ?? '').replace(',', '.'));

  if (!workDate || !orderNumber || !Number.isFinite(priceItemId) || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Заполните дату, заказ, операцию и объем' }, { status: 400 });
  }

  const priceItem = await prisma.priceItem.findUnique({ where: { id: priceItemId } });
  if (!priceItem) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  const total = quantity * priceItem.price;

  const report = await prisma.report.create({
    data: {
      workerId: Number(user.id),
      orderNumber,
      workDate: new Date(`${workDate}T00:00:00.000Z`),
      total,
      items: {
        create: {
          priceItemId: priceItem.id,
          quantity,
          price: priceItem.price,
          total,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, reportId: String(report.id) });
}
