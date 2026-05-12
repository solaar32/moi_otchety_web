import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      lines: {
        orderBy: { workerName: 'asc' },
        include: { items: { select: { id: true } } },
      },
    },
  });

  return NextResponse.json({
    payments: payments.map((p) => ({
      id: String(p.id),
      periodFrom: dateOnly(p.periodFrom),
      periodTo: dateOnly(p.periodTo),
      status: p.status,
      total: p.total,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      lines: p.lines.map((line) => ({
        id: String(line.id),
        workerId: String(line.workerId),
        workerName: line.workerName,
        worksTotal: line.worksTotal,
        adjustment: line.adjustment,
        finalTotal: line.finalTotal,
        note: line.note,
        itemsCount: line.items.length,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const from = String(body?.from ?? '').trim();
  const to = String(body?.to ?? '').trim();

  if (!from || !to) {
    return NextResponse.json({ error: 'Выберите период выплаты' }, { status: 400 });
  }

  const periodFrom = new Date(`${from}T00:00:00.000Z`);
  const periodTo = new Date(`${to}T23:59:59.999Z`);

  const items = await prisma.reportItem.findMany({
    where: {
      paymentLineId: null,
      status: 'ACCEPTED',
      report: {
        workDate: { gte: periodFrom, lte: periodTo },
      },
    },
    include: { report: { include: { worker: true } } },
  });

  if (items.length === 0) {
    return NextResponse.json({ error: 'За выбранный период нет неоплаченных работ' }, { status: 400 });
  }

  const grouped = new Map<number, { workerName: string; total: number; ids: number[] }>();
  for (const item of items) {
    const workerId = item.report.workerId;
    const existing = grouped.get(workerId) ?? { workerName: item.report.worker.fullName, total: 0, ids: [] };
    existing.total += item.total;
    existing.ids.push(item.id);
    grouped.set(workerId, existing);
  }

  const total = Array.from(grouped.values()).reduce((acc, g) => acc + g.total, 0);

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        periodFrom,
        periodTo,
        status: 'CREATED',
        total,
      },
    });

    for (const [workerId, group] of grouped.entries()) {
      const line = await tx.paymentLine.create({
        data: {
          paymentId: created.id,
          workerId,
          workerName: group.workerName,
          worksTotal: group.total,
          adjustment: 0,
          finalTotal: group.total,
        },
      });

      await tx.reportItem.updateMany({
        where: { id: { in: group.ids } },
        data: { paymentLineId: line.id, status: 'IN_PAYMENT' },
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, paymentId: String(payment.id) });
}
