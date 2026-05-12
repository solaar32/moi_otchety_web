const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const login = process.argv[2];
  const password = process.argv[3];

  if (!login || !password) {
    console.error('Usage: node scripts/reset-admin-password.cjs <login> <newPassword>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.worker.upsert({
    where: { login },
    update: { password: hash, role: Role.ADMIN, active: true },
    create: { login, password: hash, fullName: login, role: Role.ADMIN, active: true },
  });

  console.log(`Admin password reset: ${user.login}`);
}

main().finally(async () => prisma.$disconnect());
