import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseRegularSheet(rows: unknown[][]) {
  return rows.slice(1).map((row) => ({
    name: String(row[0] ?? '').trim(),
    unit: String(row[1] ?? '').trim(),
    priceWorker: asNumber(row[3]),
  })).filter((item) => item.name && item.priceWorker !== null);
}

function parseDecorative(rows: unknown[][]) {
  return rows.slice(1).flatMap((row) => {
    const name = String(row[0] ?? '').trim();
    const unit = String(row[1] ?? '').trim();
    if (!name) return [];
    const cutPolish = asNumber(row[3]);
    const cut = asNumber(row[4]);
    const polish = asNumber(row[5]);
    return [{ name, unit, priceWorker: cutPolish ?? cut ?? polish }];
  }).filter((item) => item.priceWorker !== null);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sections = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
      const items = sheetName === 'Декоративка' ? parseDecorative(rows) : parseRegularSheet(rows);
      return { name: sheetName, items };
    }).filter((section) => section.items.length > 0);

    await prisma.$transaction(async (tx) => {
      await tx.reportItem.deleteMany();
      await tx.report.deleteMany();
      await tx.priceItem.deleteMany();
      await tx.category.deleteMany();

      for (const section of sections) {
        const category = await tx.category.create({ data: { name: section.name } });
        await tx.priceItem.createMany({
          data: section.items.map((item) => ({
            categoryId: category.id,
            name: item.name,
            unit: item.unit || 'шт.',
            price: item.priceWorker ?? 0,
          })),
        });
      }
    });

    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка импорта' }, { status: 500 });
  }
}
