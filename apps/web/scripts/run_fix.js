const { config } = require('dotenv');
config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync('scripts/fix_rls.sql', 'utf8');
  await prisma.$executeRawUnsafe(sql);
  console.log('Fixed RLS successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
