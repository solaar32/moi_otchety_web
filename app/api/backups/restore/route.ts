import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const backup = await req.json();
    const data = backup?.data ?? backup;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Некорректный файл резервной копии' }, { status: 400 });
    }

    const cleanRows = (rows: any[] = []) => rows.map((row) => {
      const copy = { ...row };
      delete copy.createdAt;
      delete copy.updatedAt;
      return copy;
    });

    await prisma.$transaction(async (tx) => {
      const db = tx as any;

      if (db.auditLog) await db.auditLog.deleteMany();
      if (db.loginAttempt) await db.loginAttempt.deleteMany();
      if (db.paymentLine) await db.paymentLine.deleteMany();
      if (db.paymentItem) await db.paymentItem.deleteMany();
      await db.payment.deleteMany();
      await db.reportItem.deleteMany();
      await db.report.deleteMany();
      await db.priceItem.deleteMany();
      await db.category.deleteMany();
      if (db.priceImport) await db.priceImport.deleteMany();
      await db.worker.deleteMany();

      if (Array.isArray(data.workers) && data.workers.length) await db.worker.createMany({ data: cleanRows(data.workers) });
      if (Array.isArray(data.categories) && data.categories.length) await db.category.createMany({ data: cleanRows(data.categories) });
      if (Array.isArray(data.priceItems) && data.priceItems.length) await db.priceItem.createMany({ data: cleanRows(data.priceItems) });
      if (Array.isArray(data.priceImports) && data.priceImports.length && db.priceImport) await db.priceImport.createMany({ data: cleanRows(data.priceImports) });
      if (Array.isArray(data.reports) && data.reports.length) await db.report.createMany({ data: cleanRows(data.reports) });
      if (Array.isArray(data.reportItems) && data.reportItems.length) await db.reportItem.createMany({ data: cleanRows(data.reportItems) });
      if (Array.isArray(data.payments) && data.payments.length) await db.payment.createMany({ data: cleanRows(data.payments) });

      const paymentLines = Array.isArray(data.paymentLines) ? data.paymentLines : data.paymentItems;
      if (Array.isArray(paymentLines) && paymentLines.length && db.paymentLine) await db.paymentLine.createMany({ data: cleanRows(paymentLines) });
      if (Array.isArray(data.auditLogs) && data.auditLogs.length && db.auditLog) await db.auditLog.createMany({ data: cleanRows(data.auditLogs) });
      if (Array.isArray(data.loginAttempts) && data.loginAttempts.length && db.loginAttempt) await db.loginAttempt.createMany({ data: cleanRows(data.loginAttempts) });
    });

    return NextResponse.json({ ok: true, message: 'Резервная копия восстановлена' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Ошибка восстановления резервной копии' }, { status: 500 });
  }
}
