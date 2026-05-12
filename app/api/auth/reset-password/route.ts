import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashResetToken } from '@/lib/password-reset';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? '').trim();
    const password = String(body?.password ?? '');

    if (!token || !password) {
      return NextResponse.json({ error: 'Укажите новый пароль' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Пароль должен быть не короче 8 символов' }, { status: 400 });
    }

    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      include: { worker: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ссылка недействительна или устарела' }, { status: 400 });
    }

    if (!reset.worker.active) {
      return NextResponse.json({ error: 'Пользователь отключен' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.worker.update({
        where: { id: reset.workerId },
        data: { password: await bcrypt.hash(password, 10) },
      });

      await tx.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: reset.workerId,
          actorName: reset.worker.fullName,
          action: 'PASSWORD_RESET_COMPLETE',
          entityType: 'Worker',
          entityId: String(reset.workerId),
          description: `Пользователь ${reset.worker.login} сменил пароль через email-восстановление`,
        },
      });
    });

    return NextResponse.json({ ok: true, message: 'Пароль изменен. Теперь можно войти.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка смены пароля' }, { status: 500 });
  }
}
