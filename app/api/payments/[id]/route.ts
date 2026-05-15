import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  }

  if (user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  }

  return { user };
}

async function recalcPayment(paymentId: number) {
  const lines = await prisma.paymentLine.findMany({ where: { paymentId } });
  const total = lines.reduce((acc, line) => acc + line.finalTotal, 0);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { total },
  });
}

async function restorePaymentItems(tx: any, paymentId: number) {
  await tx.reportItem.updateMany({
    where: { paymentLine: { paymentId } },
    data: {
      paymentLineId: null,
      status: 'ACCEPTED',
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const paymentId = Number(id);

  if (!Number.isFinite(paymentId)) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { lines: true },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Ведомость не найдена' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? '');

  if (action === 'markPaid') {
    if (payment.status === 'CANCELED') {
      return NextResponse.json({ error: 'Отменённую ведомость нельзя оплатить' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      }),
      prisma.reportItem.updateMany({
        where: { paymentLine: { paymentId } },
        data: { status: 'PAID' },
      }),
      prisma.auditLog.create({
        data: {
          actorId: Number(auth.user.id),
          actorName: auth.user.name,
          action: 'MARK_PAYMENT_PAID',
          entityType: 'Payment',
          entityId: String(paymentId),
          description: `Ведомость №${paymentId} отмечена оплаченной`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === 'cancel') {
    if (payment.status === 'CANCELED') {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      await restorePaymentItems(tx, paymentId);

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CANCELED',
          paidAt: null,
          archived: false,
          archivedAt: null,
          total: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(auth.user.id),
          actorName: auth.user.name,
          action: 'CANCEL_PAYMENT',
          entityType: 'Payment',
          entityId: String(paymentId),
          description: `Ведомость №${paymentId} отменена. Работы возвращены в статус «Принято»`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  }

  if (action === 'archive') {
    if (payment.status !== 'PAID') {
      return NextResponse.json({ error: 'В архив можно отправить только оплаченную ведомость' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          archived: true,
          archivedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: Number(auth.user.id),
          actorName: auth.user.name,
          action: 'ARCHIVE_PAYMENT',
          entityType: 'Payment',
          entityId: String(paymentId),
          description: `Ведомость №${paymentId} отправлена в архив`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === 'restore') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          archived: false,
          archivedAt: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: Number(auth.user.id),
          actorName: auth.user.name,
          action: 'RESTORE_PAYMENT',
          entityType: 'Payment',
          entityId: String(paymentId),
          description: `Ведомость №${paymentId} возвращена из архива`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === 'updateLine') {
    if (payment.status !== 'CREATED') {
      return NextResponse.json({ error: 'Редактировать можно только черновик ведомости' }, { status: 400 });
    }

    const lineId = Number(body?.lineId);
    const adjustment = Number(String(body?.adjustment ?? 0).replace(',', '.')) || 0;
    const note = String(body?.note ?? '').trim();

    const line = await prisma.paymentLine.findUnique({ where: { id: lineId } });

    if (!line || line.paymentId !== paymentId) {
      return NextResponse.json({ error: 'Строка ведомости не найдена' }, { status: 404 });
    }

    await prisma.paymentLine.update({
      where: { id: lineId },
      data: {
        adjustment,
        note: note || null,
        finalTotal: line.worksTotal + adjustment,
      },
    });

    await recalcPayment(paymentId);

    await prisma.auditLog.create({
      data: {
        actorId: Number(auth.user.id),
        actorName: auth.user.name,
        action: 'EDIT_PAYMENT_LINE',
        entityType: 'PaymentLine',
        entityId: String(lineId),
        description: `Изменена строка ведомости №${paymentId}: коррекция ${adjustment}, примечание: ${note || '-'}`,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const paymentId = Number(id);

  if (!Number.isFinite(paymentId)) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    return NextResponse.json({ error: 'Ведомость не найдена' }, { status: 404 });
  }

  if (payment.status === 'PAID') {
    return NextResponse.json({ error: 'Оплаченную ведомость нельзя удалить. Можно отправить её в архив.' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await restorePaymentItems(tx, paymentId);
    await tx.paymentLine.deleteMany({ where: { paymentId } });
    await tx.payment.delete({ where: { id: paymentId } });

    await tx.auditLog.create({
      data: {
        actorId: Number(auth.user.id),
        actorName: auth.user.name,
        action: 'DELETE_PAYMENT',
        entityType: 'Payment',
        entityId: String(paymentId),
        description: `Ведомость №${paymentId} удалена. Работы возвращены в статус «Принято»`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}