import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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
    });

    return NextResponse.json({ sections });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ошибка импорта' }, { status: 500 });
  }
}
