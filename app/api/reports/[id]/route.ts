import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

const lockedStatuses = new Set(['IN_PAYMENT', 'PAID']);

async function writeAudit(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, action: string, entityId: number | string, description: string) {
  await prisma.auditLog.create({
    data: {
      actorId: Number(user.id),
      actorName: user.name,
      action,
      entityType: 'ReportItem',
      entityId: String(entityId),
      description,
    },
  });
}

async function getOwnedItem(id: number, user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const item = await prisma.reportItem.findUnique({
    where: { id },
    include: { report: true, priceItem: true },
  });
  if (!item) return null;
  if (user.role === 'worker' && item.report.workerId !== Number(user.id)) return null;
  return item;
}

async function recalcReportTotal(reportId: number) {
  const items = await prisma.reportItem.findMany({ where: { reportId } });
  const total = items.reduce((acc, item) => acc + item.total, 0);
  await prisma.report.update({ where: { id: reportId }, data: { total } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const itemId = Number(id);
  const item = await getOwnedItem(itemId, user);
  if (!item) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? '').trim();

  if (user.role === 'admin' && action) {
    if (item.status === 'PAID' || item.status === 'IN_PAYMENT') {
      return NextResponse.json({ error: 'Операцию в выплате или оплаченную операцию нельзя изменять' }, { status: 400 });
    }

    if (action === 'accept') {
      await prisma.reportItem.update({ where: { id: item.id }, data: { status: 'ACCEPTED', rejectComment: null } });
      await writeAudit(user, 'ACCEPT_REPORT_ITEM', item.id, `Операция принята: ${item.operationName ?? item.priceItem.name}`);
      return NextResponse.json({ ok: true });
    }

    if (action === 'reject') {
      const comment = String(body?.comment ?? '').trim();
      if (!comment) return NextResponse.json({ error: 'Укажите причину отклонения' }, { status: 400 });
      await prisma.reportItem.update({ where: { id: item.id }, data: { status: 'REJECTED', rejectComment: comment } });
      await writeAudit(user, 'REJECT_REPORT_ITEM', item.id, `Операция отклонена: ${comment}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  }

  if (lockedStatuses.has(item.status)) {
    return NextResponse.json({ error: 'Операцию в выплате или оплаченную операцию нельзя редактировать' }, { status: 400 });
  }

  const orderNumber = String(body?.orderNumber ?? item.report.orderNumber).trim();
  const quantity = Number(String(body?.quantity ?? item.quantity).replace(',', '.'));
  if (!orderNumber || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Укажите номер заказа и объем больше нуля' }, { status: 400 });
  }

  const total = quantity * item.price;
  await prisma.$transaction(async (tx) => {
    await tx.report.update({ where: { id: item.reportId }, data: { orderNumber } });
    await tx.reportItem.update({ where: { id: item.id }, data: { quantity, total, status: 'PENDING', rejectComment: null } });
    await tx.auditLog.create({
      data: {
        actorId: Number(user.id),
        actorName: user.name,
        action: 'EDIT_REPORT_ITEM',
        entityType: 'ReportItem',
        entityId: String(item.id),
        description: `Изменены заказ/объем. Заказ: ${orderNumber}, объем: ${quantity}`,
      },
    });
  });
  await recalcReportTotal(item.reportId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const itemId = Number(id);
  const item = await getOwnedItem(itemId, user);
  if (!item) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  if (lockedStatuses.has(item.status)) {
    return NextResponse.json({ error: 'Операцию в выплате или оплаченную операцию нельзя удалить' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportItem.delete({ where: { id: item.id } });
    await tx.auditLog.create({
      data: {
        actorId: Number(user.id),
        actorName: user.name,
        action: 'DELETE_REPORT_ITEM',
        entityType: 'ReportItem',
        entityId: String(item.id),
        description: `Удалена операция: ${item.operationName ?? item.priceItem.name}`,
      },
    });
  });

  const count = await prisma.reportItem.count({ where: { reportId: item.reportId } });
  if (count === 0) await prisma.report.delete({ where: { id: item.reportId } });
  else await recalcReportTotal(item.reportId);

  return NextResponse.json({ ok: true });
}
