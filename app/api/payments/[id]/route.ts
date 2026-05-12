import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isFinite(paymentId)) return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? '');

  if (action === 'markPaid') {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date() } }),
      prisma.reportItem.updateMany({ where: { paymentLine: { paymentId } }, data: { status: 'PAID' } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'cancel') {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return NextResponse.json({ error: 'Выплата не найдена' }, { status: 404 });
    if (payment.status === 'PAID') return NextResponse.json({ error: 'Оплаченную выплату нельзя отменить' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.reportItem.updateMany({ where: { paymentLine: { paymentId } }, data: { paymentLineId: null, status: 'ACCEPTED' } });
      await tx.payment.delete({ where: { id: paymentId } });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
