import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: { items: { orderBy: { id: 'asc' } } },
  });

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: String(category.id),
      name: category.name,
      items: category.items.map((item) => ({
        id: String(item.id),
        sectionId: String(category.id),
        name: item.name,
        unit: item.unit,
        priceWorker: item.price,
        priceCustomer: item.customerPrice,
        priceCutPolish: item.priceCutPolish,
        priceCut: item.priceCut,
        pricePolish: item.pricePolish,
      })),
    })),
  });
}
