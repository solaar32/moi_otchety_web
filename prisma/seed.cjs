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
  await upsertUser({
    login: 'Токарь',
    password: 'ALGEBRA3217',
    fullName: 'Работодатель',
    role: Role.ADMIN,
  });

  console.log('Seed complete: Токарь / ALGEBRA3217');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
