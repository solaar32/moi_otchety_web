import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function getOwnedItem(id: number, user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return prisma.reportItem.findUnique({
    where: { id },
    include: { report: true, priceItem: true },
  }).then((item) => {
    if (!item) return null;
    if (user.role === 'worker' && item.report.workerId !== Number(user.id)) return null;
    return item;
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const itemId = Number(id);
  const item = await getOwnedItem(itemId, user);
  if (!item) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const orderNumber = String(body?.orderNumber ?? item.report.orderNumber).trim();
  const quantity = Number(String(body?.quantity ?? item.quantity).replace(',', '.'));
  if (!orderNumber || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Укажите номер заказа и объем больше нуля' }, { status: 400 });
  }

  const total = quantity * item.price;
  await prisma.$transaction([
    prisma.report.update({
      where: { id: item.reportId },
      data: { orderNumber, total },
    }),
    prisma.reportItem.update({
      where: { id: item.id },
      data: { quantity, total },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id } = await params;
  const itemId = Number(id);
  const item = await getOwnedItem(itemId, user);
  if (!item) return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 });

  await prisma.report.delete({ where: { id: item.reportId } });
  return NextResponse.json({ ok: true });
}
