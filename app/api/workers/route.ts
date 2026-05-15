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
  return String(value ?? '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'WORKER';
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const workers = await prisma.worker.findMany({
    orderBy: [{ role: 'asc' }, { active: 'desc' }, { fullName: 'asc' }],
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

  return NextResponse.json({
    workers: workers.map((worker) => ({
      ...worker,
      id: String(worker.id),
      role: worker.role.toLowerCase(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);

  const login = String(body?.login ?? '').trim();
  const fullName = String(body?.fullName ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '').trim();
  const role = normalizeRole(body?.role);

  if (!login || !fullName || !password) {
    return NextResponse.json({ error: 'Укажите логин, ФИО и пароль' }, { status: 400 });
  }

  const exists = await prisma.worker.findUnique({ where: { login } });

  if (exists) {
    return NextResponse.json({ error: 'Такой логин уже есть' }, { status: 400 });
  }

  const worker = await prisma.worker.create({
    data: {
      login,
      fullName,
      email: email || null,
      password: await bcrypt.hash(password, 10),
      role,
      active: true,
    },
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
      action: role === 'ADMIN' ? 'CREATE_ADMIN' : 'CREATE_WORKER',
      entityType: 'Worker',
      entityId: String(worker.id),
      description: `Создан пользователь ${worker.fullName} (${worker.login}), роль: ${role}`,
    },
  });

  return NextResponse.json({
    worker: {
      ...worker,
      id: String(worker.id),
      role: worker.role.toLowerCase(),
    },
  });
}