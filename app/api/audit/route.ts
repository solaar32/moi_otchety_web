import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    items: logs.map((log) => ({
      id: String(log.id),
      actorName: log.actorName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
    })),
  });
}
