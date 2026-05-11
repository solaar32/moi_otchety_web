import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME, createSessionToken, dbRoleToClient } from '@/lib/session';
import type { User } from '@/lib/types';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const login = String(body?.login ?? '').trim();
  const password = String(body?.password ?? '');

  if (!login || !password) {
    return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({ where: { login } });
  if (!worker || !worker.active) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, worker.password);
  if (!ok) {
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }

  const user: User = {
    id: String(worker.id),
    login: worker.login,
    name: worker.fullName,
    role: dbRoleToClient(worker.role),
    active: worker.active,
  };

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ user });
}
