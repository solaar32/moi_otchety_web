import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const login = searchParams.get('login')?.trim();
  const success = searchParams.get('success');

  const where: any = {};
  if (login) where.login = { contains: login, mode: 'insensitive' };
  if (success === 'true') where.success = true;
  if (success === 'false') where.success = false;

  const attempts = await prisma.loginAttempt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const since = new Date(Date.now() - 15 * 60 * 1000);
  const recentFailed = await prisma.loginAttempt.count({
    where: { success: false, createdAt: { gte: since } },
  });

  return NextResponse.json({
    recentFailed,
    items: attempts.map((item) => ({
      id: String(item.id),
      login: item.login,
      ip: item.ip,
      userAgent: item.userAgent,
      success: item.success,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
