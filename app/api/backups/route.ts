import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [workers, categories, priceItems, reports, reportItems, payments, paymentLines, priceImports, auditLogs] = await Promise.all([
    prisma.worker.findMany({ orderBy: { id: 'asc' } }),
    prisma.category.findMany({ orderBy: { id: 'asc' } }),
    prisma.priceItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.report.findMany({ orderBy: { id: 'asc' } }),
    prisma.reportItem.findMany({ orderBy: { id: 'asc' } }),
    prisma.payment.findMany({ orderBy: { id: 'asc' } }),
    prisma.paymentLine.findMany({ orderBy: { id: 'asc' } }),
    prisma.priceImport.findMany({ orderBy: { id: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const backup = {
    app: 'Мои отчеты',
    version: 'v15',
    createdAt: new Date().toISOString(),
    counts: {
      workers: workers.length,
      categories: categories.length,
      priceItems: priceItems.length,
      reports: reports.length,
      reportItems: reportItems.length,
      payments: payments.length,
      paymentLines: paymentLines.length,
      priceImports: priceImports.length,
      auditLogs: auditLogs.length,
    },
    data: { workers, categories, priceItems, reports, reportItems, payments, paymentLines, priceImports, auditLogs },
  };

  const fileName = `moi-otchety-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
