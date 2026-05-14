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
  priceItem: {
    price: number | null;
    priceCutPolish: number | null;
    priceCut: number | null;
    pricePolish: number | null;
  },
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
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  return reports.flatMap((report) =>
    report.items.map((item) => {
      const isCustom = !item.priceItemId || !item.priceItem;

      return {
        id: String(item.id),
        reportId: String(report.id),
        reportDate: formatDate(report.workDate),
        workerName: report.worker.fullName,
        orderNo: report.orderNumber,
        section:
          item.sectionName ??
          (isCustom ? 'Нестандартные операции' : item.priceItem?.category?.name ?? 'Без раздела'),
        operation: item.operationName ?? item.priceItem?.name ?? 'Нестандартная операция',
        unit: item.unitSnapshot ?? item.customUnit ?? item.priceItem?.unit ?? '',
        qty: item.quantity,
        price: item.price ?? 0,
        total: item.total,
        customerPrice: null,
        customerTotal: null,
        status: item.status,
        rejectComment: item.rejectComment,
        paymentId: item.paymentLineId == null ? null : String(item.paymentLineId),
      };
    }),
  );
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const items = await getReportRows(user);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (user.role !== 'worker') {
    return NextResponse.json({ error: 'Только работник может создавать отчёт' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  const workDate = String(body?.workDate ?? '').trim();
  const orderNumber = String(body?.orderNumber ?? '').trim();
  const quantity = Number(String(body?.quantity ?? '').replace(',', '.'));

  if (body?.kind === 'custom') {
    const operationName = String(body?.operationName ?? '').trim();
    const customUnit = String(body?.unit ?? '').trim();
    const price = Number(String(body?.price ?? '').replace(',', '.'));

    if (
      !workDate ||
      !orderNumber ||
      !operationName ||
      !customUnit ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { error: 'Заполните дату, заказ, наименование, ед. изм., цену и количество' },
        { status: 400 },
      );
    }

    const total = quantity * price;

    const report = await prisma.report.create({
      data: {
        workerId: Number(user.id),
        orderNumber,
        workDate: new Date(`${workDate}T00:00:00.000Z`),
        total,
        items: {
          create: {
            quantity,
            price,
            total,
            operationType: 'custom',
            operationName,
            customUnit,
            sectionName: 'Нестандартные операции',
            unitSnapshot: customUnit,
            status: 'PENDING',
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: Number(user.id),
        actorName: user.name,
        action: 'CREATE_CUSTOM_REPORT_ITEM',
        entityType: 'Report',
        entityId: String(report.id),
        description: `Создана нестандартная операция: ${operationName}, заказ ${orderNumber}, ${quantity} ${customUnit} × ${price}`,
      },
    });

    return NextResponse.json({ ok: true, reportId: String(report.id) });
  }

  const priceItemId = Number(body?.priceItemId);
  const rawOperationType = body?.operationType;

  if (!workDate || !orderNumber || !Number.isFinite(priceItemId) || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Заполните дату, заказ, операцию и объём' }, { status: 400 });
  }

  const priceItem = await prisma.priceItem.findUnique({
    where: { id: priceItemId },
    include: { category: true },
  });

  if (!priceItem) {
    return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });
  }

  const isDecorative = priceItem.category.name.trim().toLowerCase() === 'декоративка';
  const operationType = isDecorative && isDecorativeType(rawOperationType) ? rawOperationType : undefined;

  if (isDecorative && !operationType) {
    return NextResponse.json(
      { error: 'Выберите вид работы: резка+полировка, резка или полировка' },
      { status: 400 },
    );
  }

  const workerPrice = priceForType(priceItem, operationType);

  if (workerPrice === null || workerPrice === undefined) {
    return NextResponse.json({ error: 'У выбранной операции нет цены для работника' }, { status: 400 });
  }

  const operationName = operationType
    ? `${priceItem.name} — ${decorativeTypes[operationType]}`
    : priceItem.name;

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
          sectionName: priceItem.category.name,
          unitSnapshot: priceItem.unit,
          status: 'PENDING',
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: Number(user.id),
      actorName: user.name,
      action: 'CREATE_REPORT_ITEM',
      entityType: 'Report',
      entityId: String(report.id),
      description: `Создана операция: ${operationName}, заказ ${orderNumber}, объём ${quantity}`,
    },
  });

  return NextResponse.json({ ok: true, reportId: String(report.id) });
}