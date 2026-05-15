import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

function normalizeRole(value: unknown) {
  return String(value ?? '').toUpperCase() === 'ADMIN' || String(value ?? '').toLowerCase() === 'admin'
    ? 'ADMIN'
    : 'WORKER';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const workerId = Number(id);

  if (!Number.isFinite(workerId)) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);

  const login = String(body?.login ?? '').trim();
  const fullName = String(body?.fullName ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '').trim();
  const active = Boolean(body?.active);
  const role = normalizeRole(body?.role);

  if (!login || !fullName) {
    return NextResponse.json({ error: 'Укажите логин и ФИО' }, { status: 400 });
  }

  const adminCount = await prisma.worker.count({
    where: {
      role: 'ADMIN',
      active: true,
    },
  });

  const current = await prisma.worker.findUnique({
    where: { id: workerId },
  });

  if (!current) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  if (current.role === 'ADMIN' && (!active || role !== 'ADMIN') && adminCount <= 1) {
    return NextResponse.json(
      { error: 'Нельзя отключить или понизить последнего активного администратора' },
      { status: 400 },
    );
  }

  const data: {
    login: string;
    fullName: string;
    email: string | null;
    active: boolean;
    role: 'ADMIN' | 'WORKER';
    password?: string;
  } = {
    login,
    fullName,
    email: email || null,
    active,
    role,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  try {
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data,
      select: {
        id: true,
        login: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: Number(auth.user.id),
        actorName: auth.user.name,
        action: 'UPDATE_USER',
        entityType: 'Worker',
        entityId: String(worker.id),
        description: `Изменен пользователь ${worker.fullName} (${worker.login}), роль: ${worker.role}, активен: ${
          worker.active ? 'да' : 'нет'
        }${password ? ', пароль изменен' : ''}`,
      },
    });

    return NextResponse.json({
      worker: {
        ...worker,
        id: String(worker.id),
        role: worker.role.toLowerCase(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Пользователь не найден или логин уже занят' },
      { status: 400 },
    );
  }
}