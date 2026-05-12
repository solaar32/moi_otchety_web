import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isFinite(auditId)) return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });

  const log = await prisma.auditLog.findUnique({ where: { id: auditId } });
  if (!log) return NextResponse.json({ error: 'Запись журнала не найдена' }, { status: 404 });

  if (log.action.endsWith('_UNDO')) {
    return NextResponse.json({ error: 'Это действие уже является отменой' }, { status: 400 });
  }

  if (log.entityType === 'ReportItem') {
    const itemId = Number(log.entityId);
    const item = await prisma.reportItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });
    if (item.status === 'PAID') return NextResponse.json({ error: 'Оплаченную операцию нельзя отменить через журнал' }, { status: 400 });

    if (['ACCEPT_REPORT_ITEM', 'REJECT_REPORT_ITEM', 'BULK_ACCEPT_REPORT_ITEMS'].includes(log.action)) {
      await prisma.$transaction([
        prisma.reportItem.update({ where: { id: itemId }, data: { status: 'PENDING', rejectComment: null } }),
        prisma.auditLog.create({
          data: {
            actorId: Number(auth.user.id),
            actorName: auth.user.name,
            action: `${log.action}_UNDO`,
            entityType: log.entityType,
            entityId: log.entityId,
            description: `Отменено действие журнала №${log.id}. Работа возвращена на проверку`,
          },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }
  }

  if (log.entityType === 'Payment') {
    const paymentId = Number(log.entityId);
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 });

    if (log.action === 'MARK_PAYMENT_PAID') {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: paymentId }, data: { status: 'CREATED', paidAt: null } }),
        prisma.reportItem.updateMany({ where: { paymentLine: { paymentId } }, data: { status: 'IN_PAYMENT' } }),
        prisma.auditLog.create({
          data: {
            actorId: Number(auth.user.id),
            actorName: auth.user.name,
            action: 'MARK_PAYMENT_PAID_UNDO',
            entityType: 'Payment',
            entityId: String(paymentId),
            description: `Отменена отметка оплаты выплаты №${paymentId}`,
          },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (log.action === 'CREATE_PAYMENT' && payment.status !== 'PAID') {
      await prisma.$transaction(async (tx) => {
        await tx.reportItem.updateMany({ where: { paymentLine: { paymentId } }, data: { paymentLineId: null, status: 'ACCEPTED' } });
        await tx.payment.update({ where: { id: paymentId }, data: { status: 'CANCELED', paidAt: null, total: 0 } });
        await tx.auditLog.create({
          data: {
            actorId: Number(auth.user.id),
            actorName: auth.user.name,
            action: 'CREATE_PAYMENT_UNDO',
            entityType: 'Payment',
            entityId: String(paymentId),
            description: `Через журнал отменено создание выплаты №${paymentId}`,
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: 'Это действие нельзя автоматически отменить. Используйте соответствующий раздел системы.' }, { status: 400 });
}
