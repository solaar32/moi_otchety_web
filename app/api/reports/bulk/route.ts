import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? '');
  if (action !== 'acceptFiltered') return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });

  const workerName = String(body?.workerName ?? '').trim();
  const section = String(body?.section ?? '').trim();
  const orderNo = String(body?.orderNo ?? '').trim();
  const from = String(body?.from ?? '').trim();
  const to = String(body?.to ?? '').trim();

  if (!workerName) {
    return NextResponse.json({ error: 'Для массового принятия выберите работника' }, { status: 400 });
  }

  const where = {
    status: { in: ['PENDING', 'REJECTED'] },
    paymentLineId: null,
    report: {
      worker: { fullName: workerName },
      ...(orderNo ? { orderNumber: { contains: orderNo, mode: 'insensitive' as const } } : {}),
      ...(from || to
        ? {
            workDate: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    ...(section ? { priceItem: { category: { name: section } } } : {}),
  };

  const result = await prisma.reportItem.updateMany({
    where,
    data: { status: 'ACCEPTED', rejectComment: null },
  });

  await prisma.auditLog.create({
    data: {
      actorId: Number(auth.user.id),
      actorName: auth.user.name,
      action: 'BULK_ACCEPT_REPORT_ITEMS',
      entityType: 'ReportItem',
      entityId: 'bulk',
      description: `Массово принято работ: ${result.count}. Работник: ${workerName}`,
    },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
