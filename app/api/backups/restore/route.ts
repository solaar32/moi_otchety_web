import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

function toDate(value: unknown) {
  if (!value) return undefined;
  return new Date(String(value));
}

function cleanRows(rows: any[] = []) {
  return rows.map((row) => {
    const out: Record<string, any> = { ...row };
    for (const key of Object.keys(out)) {
      if (key.toLowerCase().endsWith('at') || key === 'workDate' || key === 'periodFrom' || key === 'periodTo') {
        if (out[key]) out[key] = toDate(out[key]);
      }
    }
    return out;
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const data = body?.data;
  if (!data) return NextResponse.json({ error: 'Некорректный файл резервной копии' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.reportItem.deleteMany();
    await tx.paymentLine.deleteMany();
    await tx.payment.deleteMany();
    await tx.report.deleteMany();
    await tx.priceItem.deleteMany();
    await tx.category.deleteMany();
    await tx.priceImport.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.worker.deleteMany();

    if (data.workers?.length) await tx.worker.createMany({ data: cleanRows(data.workers) });
    if (data.categories?.length) await tx.category.createMany({ data: cleanRows(data.categories) });
    if (data.priceItems?.length) await tx.priceItem.createMany({ data: cleanRows(data.priceItems) });
    if (data.reports?.length) await tx.report.createMany({ data: cleanRows(data.reports) });
    if (data.payments?.length) await tx.payment.createMany({ data: cleanRows(data.payments) });
    if (data.paymentLines?.length) await tx.paymentLine.createMany({ data: cleanRows(data.paymentLines) });
    if (data.reportItems?.length) await tx.reportItem.createMany({ data: cleanRows(data.reportItems) });
    if (data.priceImports?.length) await tx.priceImport.createMany({ data: cleanRows(data.priceImports) });
    if (data.auditLogs?.length) await tx.auditLog.createMany({ data: cleanRows(data.auditLogs) });

    await tx.auditLog.create({
      data: {
        actorId: Number(auth.user.id),
        actorName: auth.user.name,
        action: 'RESTORE_BACKUP',
        entityType: 'Backup',
        entityId: 'json',
        description: `Восстановлена резервная копия от ${body.createdAt ?? 'неизвестная дата'}`,
      },
    });
  }, { timeout: 30000 });

  return NextResponse.json({ ok: true });
}
