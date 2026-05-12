import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createResetToken, hashResetToken, maskEmail } from '@/lib/password-reset';
import { getAppUrl, sendMail } from '@/lib/mail';

function getIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const identifier = String(body?.identifier ?? '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Укажите логин или email' }, { status: 400 });
    }

    const ip = getIp(req);
    const userAgent = req.headers.get('user-agent') || '';

    const recentCount = await prisma.passwordResetToken.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        OR: [{ ip }, { worker: { login: identifier } }, { worker: { email: identifier.toLowerCase() } }],
      },
    });

    if (recentCount >= 5) {
      return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 });
    }

    const worker = await prisma.worker.findFirst({
      where: { active: true, OR: [{ login: identifier }, { email: identifier.toLowerCase() }] },
      select: { id: true, login: true, fullName: true, email: true },
    });

    if (!worker || !worker.email) {
      return NextResponse.json({ ok: true, message: 'Если email указан в профиле, ссылка восстановления будет отправлена.' });
    }

    await prisma.passwordResetToken.updateMany({
      where: { workerId: worker.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = createResetToken();
    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

    await prisma.passwordResetToken.create({
      data: {
        workerId: worker.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ip,
        userAgent,
      },
    });

    await sendMail({
      to: worker.email,
      subject: 'Восстановление пароля — Мои отчеты',
      text: `Здравствуйте, ${worker.fullName}.\n\nДля восстановления пароля перейдите по ссылке:\n${resetUrl}\n\nСсылка действует 30 минут.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Восстановление пароля</h2><p>Здравствуйте, ${worker.fullName}.</p><p>Ссылка действует 30 минут.</p><p><a href="${resetUrl}" style="display:inline-block;background:#2f94d1;color:white;padding:12px 18px;border-radius:10px;text-decoration:none">Сменить пароль</a></p><p>${resetUrl}</p></div>`,
    });

    await prisma.auditLog.create({
      data: {
        actorName: worker.fullName,
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'Worker',
        entityId: String(worker.id),
        description: `Запрошено восстановление пароля для ${worker.login}, email: ${maskEmail(worker.email)}`,
      },
    });

    return NextResponse.json({ ok: true, message: 'Если email указан в профиле, ссылка восстановления будет отправлена.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка восстановления пароля' }, { status: 500 });
  }
}
