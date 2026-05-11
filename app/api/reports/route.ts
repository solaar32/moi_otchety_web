import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

const decorativeTypes = {
  cutPolish: 'Резка+полировка',
  cut: 'Резка',
  polish: 'Полировка',
} as const;

type DecorativeType = keyof typeof decorativeTypes;

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isDecorativeType(value: unknown): value is DecorativeType {
  return value === 'cutPolish' || value === 'cut' || value === 'polish';
}

function priceForType(
  priceItem: { price: number | null; priceCutPolish: number | null; priceCut: number | null; pricePolish: number | null },
  type?: DecorativeType,
) {
  if (type === 'cutPolish') return priceItem.priceCutPolish;
  if (type === 'cut') return priceItem.priceCut;
  if (type === 'polish') return priceItem.pricePolish;
  return priceItem.price;
}

async function getReportRows(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return [];

  const reports = await prisma.report.findMany({
    where: user.role === 'worker' ? { workerId: Number(user.id) } : undefined,
    orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
    include: {
      worker: true,
      items: {
        orderBy: { id: 'desc' },
        include: {
          priceItem: {
            include: { category: true },
          },
        },
      },
    },
  });

  return reports.flatMap((report) => report.items.map((item) => {
    const customerPrice = item.priceItem.customerPrice;
    return {
      id: String(item.id),
      reportId: String(report.id),
      reportDate: formatDate(report.workDate),
      workerName: report.worker.fullName,
      orderNo: report.orderNumber,
      section: item.priceItem.category.name,
      operation: item.operationName ?? item.priceItem.name,
      unit: item.priceItem.unit,
      qty: item.quantity,
      price: item.price ?? 0,
      total: item.total,
      customerPrice,
      customerTotal: customerPrice == null ? null : customerPrice * item.quantity,
    };
  }));
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
  const rawOperationType = body?.operationType;

  if (!workDate || !orderNumber || !Number.isFinite(priceItemId) || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Заполните дату, заказ, операцию и объем' }, { status: 400 });
  }

  const priceItem = await prisma.priceItem.findUnique({
    where: { id: priceItemId },
    include: { category: true },
  });
  if (!priceItem) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  const isDecorative = priceItem.category.name.trim().toLowerCase() === 'декоративка';
  const operationType = isDecorative && isDecorativeType(rawOperationType) ? rawOperationType : undefined;

  if (isDecorative && !operationType) {
    return NextResponse.json({ error: 'Выберите вид работы: резка+полировка, резка или полировка' }, { status: 400 });
  }

  const workerPrice = priceForType(priceItem, operationType);
  if (workerPrice === null || workerPrice === undefined) {
    return NextResponse.json({ error: 'У выбранной операции нет цены для работника' }, { status: 400 });
  }

  const operationName = operationType ? `${priceItem.name} — ${decorativeTypes[operationType]}` : priceItem.name;
  const total = quantity * workerPrice;

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
          price: workerPrice,
          total,
          operationType: operationType ?? null,
          operationName,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, reportId: String(report.id) });
}
