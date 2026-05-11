import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const latest = await prisma.priceImport.findFirst({
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json({ priceImport: latest });
}
