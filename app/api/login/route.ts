import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME, createSessionToken, dbRoleToClient } from '@/lib/session';
import type { User } from '@/lib/types';

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

function getClientIp(h: Headers) {
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return h.get('x-real-ip') || null;
}

async function writeLoginAttempt(input: {
  login: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  reason?: string;
}) {
  try {
    await prisma.loginAttempt.create({
      data: {
        login: input.login,
        ip: input.ip,
        userAgent: input.userAgent,
        success: input.success,
        reason: input.reason ?? null,
      },
    });
  } catch (error) {
    console.error('loginAttempt log error', error);
  }
}

async function isLimited(login: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const where = {
    success: false,
    createdAt: { gte: since },
    OR: [
      { login },
      ...(ip ? [{ ip }] : []),
    ],
  };

  const failedCount = await prisma.loginAttempt.count({ where });
  return failedCount >= MAX_FAILED_ATTEMPTS;
}

export async function POST(req: Request) {
  const h = await headers();
  const ip = getClientIp(h);
  const userAgent = h.get('user-agent');

  const body = await req.json().catch(() => null);
  const login = String(body?.login ?? '').trim();
  const password = String(body?.password ?? '');

  if (!login || !password) {
    await writeLoginAttempt({ login: login || '-', ip, userAgent, success: false, reason: 'empty_credentials' });
    return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 });
  }

  if (await isLimited(login, ip)) {
    await writeLoginAttempt({ login, ip, userAgent, success: false, reason: 'rate_limited' });
    return NextResponse.json(
      { error: `Слишком много попыток входа. Повторите через ${WINDOW_MINUTES} минут.` },
      { status: 429 }
    );
  }

  const worker = await prisma.worker.findUnique({ where: { login } });
  if (!worker || !worker.active) {
    await writeLoginAttempt({ login, ip, userAgent, success: false, reason: 'not_found_or_inactive' });
    return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, worker.password);
  if (!ok) {
    await writeLoginAttempt({ login, ip, userAgent, success: false, reason: 'wrong_password' });
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
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  await writeLoginAttempt({ login, ip, userAgent, success: true, reason: 'ok' });

  return NextResponse.json({ user });
}
