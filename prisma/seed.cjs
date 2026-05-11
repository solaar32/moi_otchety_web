const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser({ login, password, fullName, role }) {
  const hash = await bcrypt.hash(password, 10);
  await prisma.worker.upsert({
    where: { login },
    update: { password: hash, fullName, role, active: true },
    create: { login, password: hash, fullName, role, active: true },
  });
}

async function main() {
  await upsertUser({ login: 'admin', password: 'admin123', fullName: 'Работодатель', role: Role.ADMIN });
  await upsertUser({ login: 'Иванов', password: '123456', fullName: 'Иванов Иван', role: Role.WORKER });
  await upsertUser({ login: 'Петров', password: '123456', fullName: 'Петров Петр', role: Role.WORKER });

  const section = await prisma.category.upsert({
    where: { name: 'Декоративка' },
    update: {},
    create: { name: 'Декоративка' },
  });

  await prisma.priceItem.upsert({
    where: { id: 1 },
    update: { categoryId: section.id, name: 'Рез', unit: 'м/п', price: 200 },
    create: { categoryId: section.id, name: 'Рез', unit: 'м/п', price: 200 },
  });

  console.log('Seed complete: admin/admin123, Иванов/123456, Петров/123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
