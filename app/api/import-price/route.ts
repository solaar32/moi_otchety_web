import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

type ImportedItem = {
  name: string;
  unit: string;
  priceCustomer: number | null;
  priceWorker: number | null;
  priceCutPolish?: number | null;
  priceCut?: number | null;
  pricePolish?: number | null;
};

type ImportedSection = {
  name: string;
  items: ImportedItem[];
};

function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function key(value: string) {
  return clean(value).toLowerCase().replace(/ё/g, 'е');
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    if (!normalized || normalized === '-') return null;

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function hasAnyPrice(item: ImportedItem) {
  return Boolean(item.name) && (
    item.priceCustomer !== null ||
    item.priceWorker !== null ||
    item.priceCutPolish !== null ||
    item.priceCut !== null ||
    item.pricePolish !== null
  );
}

function fillRight(values: unknown[]) {
  const result: string[] = [];
  let last = '';

  for (const value of values) {
    const current = clean(value);
    if (current) last = current;
    result.push(last);
  }

  return result;
}

function isBlankRow(row: unknown[]) {
  return row.every((cell) => clean(cell) === '');
}

function trimEmptyRows(rows: unknown[][]) {
  let last = rows.length - 1;
  while (last >= 0 && isBlankRow(rows[last])) last -= 1;
  return rows.slice(0, last + 1);
}

function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  const ref = sheet['!ref'];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const rows: unknown[][] = [];

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: unknown[] = [];

    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address];
      row[c - range.s.c] = cell ? (cell.v ?? cell.w ?? null) : null;
    }

    rows.push(row);
  }

  for (const merge of sheet['!merges'] ?? []) {
    const sourceAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const sourceCell = sheet[sourceAddress];
    const value = sourceCell ? (sourceCell.v ?? sourceCell.w ?? null) : null;

    if (value === null || value === undefined || clean(value) === '') continue;

    for (let r = merge.s.r; r <= merge.e.r; r += 1) {
      for (let c = merge.s.c; c <= merge.e.c; c += 1) {
        const rr = r - range.s.r;
        const cc = c - range.s.c;

        if (rr >= 0 && rr < rows.length && cc >= 0) {
          rows[rr][cc] = rows[rr][cc] ?? value;
        }
      }
    }
  }

  return trimEmptyRows(rows);
}

function parseRegularSheet(rows: unknown[][]): ImportedItem[] {
  const header = rows[0] ?? [];
  const lower = header.map((v) => key(clean(v)));
  const customerCol = lower.findIndex((v) => v.includes('цена для заказчика'));
  const workerCol = lower.findIndex((v) => v.includes('цена для работника'));

  const customerIndex = customerCol >= 0 ? customerCol : 2;
  const workerIndex = workerCol >= 0 ? workerCol : 3;

  return rows.slice(1)
    .map((row) => ({
      name: clean(row[0]),
      unit: clean(row[1]) || 'шт.',
      priceCustomer: asNumber(row[customerIndex]),
      priceWorker: asNumber(row[workerIndex]),
    }))
    .filter(hasAnyPrice);
}

function parseDecorative(rows: unknown[][]): ImportedItem[] {
  const result: ImportedItem[] = [];

  for (const row of rows.slice(1)) {
    const name = clean(row[0]);
    if (!name) continue;

    const item: ImportedItem = {
      name,
      unit: clean(row[1]) || 'шт.',
      priceCustomer: asNumber(row[2]),
      priceWorker: asNumber(row[3]) ?? asNumber(row[4]) ?? asNumber(row[5]),
      priceCutPolish: asNumber(row[3]),
      priceCut: asNumber(row[4]),
      pricePolish: asNumber(row[5]),
    };

    if (hasAnyPrice(item)) result.push(item);
  }

  return result;
}

function parseDegreeSheet(rows: unknown[][]): ImportedItem[] {
  const result: ImportedItem[] = [];
  const header1 = fillRight(rows[0] ?? []);
  const header2 = rows[1] ?? [];

  const workerCols = header2
    .map((value, index) => ({ value: key(clean(value)), index }))
    .filter((cell) => cell.value.includes('цена для работника'))
    .map((cell) => cell.index);

  const columns = workerCols.length > 0
    ? workerCols
    : [2, 4, 6, 8].filter((index) => index < (rows[1]?.length ?? 0));

  for (const row of rows.slice(2)) {
    const size = clean(row[0]);
    if (!size) continue;

    for (const workerCol of columns) {
      const customerCol = workerCol - 1;
      const category = header1[customerCol] || header1[workerCol];

      const item: ImportedItem = {
        name: [size, category].filter(Boolean).join(' — '),
        unit: 'шт.',
        priceCustomer: asNumber(row[customerCol]),
        priceWorker: asNumber(row[workerCol]),
      };

      if (hasAnyPrice(item)) result.push(item);
    }
  }

  return result;
}

function parseCrossesSheet(rows: unknown[][]): ImportedItem[] {
  const result: ImportedItem[] = [];
  const header1 = fillRight(rows[0] ?? []);
  const header2 = fillRight(rows[1] ?? []);
  const header3 = rows[2] ?? [];

  const workerCols = header3
    .map((value, index) => ({ value: key(clean(value)), index }))
    .filter((cell) => cell.value.includes('цена для работника'))
    .map((cell) => cell.index);

  const columns = workerCols.length > 0
    ? workerCols
    : [2, 4, 6, 8, 10, 12].filter((index) => index < (rows[2]?.length ?? 0));

  for (const row of rows.slice(3)) {
    const size = clean(row[0]);
    if (!size) continue;

    for (const workerCol of columns) {
      const customerCol = workerCol - 1;
      const group = header1[customerCol] || header1[workerCol];
      const operation = header2[customerCol] || header2[workerCol];

      const item: ImportedItem = {
        name: [size, group, operation].filter(Boolean).join(' — '),
        unit: 'шт.',
        priceCustomer: asNumber(row[customerCol]),
        priceWorker: asNumber(row[workerCol]),
      };

      if (hasAnyPrice(item)) result.push(item);
    }
  }

  return result;
}

function parseSheet(sheetName: string, rows: unknown[][]): ImportedItem[] {
  const name = key(sheetName);

  if (name.includes('декоратив')) return parseDecorative(rows);
  if (name.includes('резка по степен')) return parseDegreeSheet(rows);
  if (name.includes('полировка по степен')) return parseDegreeSheet(rows);
  if (name.includes('крест') && name.includes('резка')) return parseCrossesSheet(rows);

  return parseRegularSheet(rows);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });

    const sections: ImportedSection[] = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = sheetToRows(sheet);
      const items = parseSheet(sheetName, rows);

      return {
        name: sheetName,
        items,
      };
    }).filter((section) => section.items.length > 0);

    const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);

    if (sections.length === 0 || totalItems === 0) {
      return NextResponse.json({ error: 'В файле не найдено позиций прайса' }, { status: 400 });
    }

    const version = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    const priceImport = await prisma.$transaction(async (tx) => {
      await tx.priceItem.updateMany({
        data: { active: false },
      });

      await tx.category.updateMany({
        data: { active: false },
      });

      for (const section of sections) {
        const category = await tx.category.upsert({
          where: { name: section.name },
          update: {
            name: section.name,
            active: true,
          },
          create: {
            name: section.name,
            active: true,
          },
        });

        for (const item of section.items) {
          const existing = await tx.priceItem.findFirst({
            where: {
              categoryId: category.id,
              name: item.name,
              unit: item.unit || 'шт.',
            },
          });

          if (existing) {
            await tx.priceItem.update({
              where: { id: existing.id },
              data: {
                active: true,
                price: item.priceWorker,
                customerPrice: item.priceCustomer,
                priceCutPolish: item.priceCutPolish ?? null,
                priceCut: item.priceCut ?? null,
                pricePolish: item.pricePolish ?? null,
              },
            });
          } else {
            await tx.priceItem.create({
              data: {
                categoryId: category.id,
                name: item.name,
                unit: item.unit || 'шт.',
                active: true,
                price: item.priceWorker,
                customerPrice: item.priceCustomer,
                priceCutPolish: item.priceCutPolish ?? null,
                priceCut: item.priceCut ?? null,
                pricePolish: item.pricePolish ?? null,
              },
            });
          }
        }
      }

      const createdImport = await tx.priceImport.create({
        data: {
          fileName: file.name,
          version,
          sectionsCount: sections.length,
          itemsCount: totalItems,
          uploadedBy: user.login,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: Number(user.id),
          actorName: user.name,
          action: 'IMPORT_PRICE',
          entityType: 'PriceImport',
          entityId: String(createdImport.id),
          description: `Загружен новый прайс: ${file.name}. Разделов: ${sections.length}, позиций: ${totalItems}`,
        },
      });

      return createdImport;
    });

    console.log('PRICE_IMPORT', sections.map((s) => `${s.name}: ${s.items.length}`).join(' | '));

    return NextResponse.json({
      sections,
      priceImport,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка импорта' },
      { status: 500 },
    );
  }
}