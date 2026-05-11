import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
  const workerId = Number(id);
  if (!Number.isFinite(workerId)) return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const login = String(body?.login ?? '').trim();
  const fullName = String(body?.fullName ?? '').trim();
  const password = String(body?.password ?? '').trim();
  const active = Boolean(body?.active);

  if (!login || !fullName) {
    return NextResponse.json({ error: 'Укажите логин и ФИО' }, { status: 400 });
  }

  const data: { login: string; fullName: string; active: boolean; password?: string } = {
    login,
    fullName,
    active,
  };

  if (password) data.password = await bcrypt.hash(password, 10);

  try {
    const worker = await prisma.worker.update({
      where: { id: workerId, role: 'WORKER' },
      data,
      select: { id: true, login: true, fullName: true, active: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ worker: { ...worker, id: String(worker.id) } });
  } catch {
    return NextResponse.json({ error: 'Работник не найден или логин уже занят' }, { status: 400 });
  }
}
