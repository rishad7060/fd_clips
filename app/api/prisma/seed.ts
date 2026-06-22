/**
 * Prisma seed — provisions the system admin (real/Postgres mode).
 *
 * Idempotent: upserts an "FocalDive Admin" organization and an admin User keyed
 * by ADMIN_EMAIL. The password is bcrypt-hashed from ADMIN_PASSWORD. Run with:
 *   npx prisma db seed   (or `npm run prisma:seed`)
 *
 * In MOCK mode the API uses the in-memory store, which seeds an equivalent admin
 * on boot (see app/api/src/persistence/memory.store.ts) — this script is only
 * needed against a real database.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@focaldive.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'changeme-admin';
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || 'System Admin';

async function main(): Promise<void> {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', passwordHash, name: ADMIN_NAME },
    });
    // eslint-disable-next-line no-console
    console.log(`Updated existing admin: ${ADMIN_EMAIL}`);
    return;
  }

  const org = await prisma.organization.create({
    data: { name: 'FocalDive Admin', plan: 'pro', creditBalance: 0 },
  });
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      passwordHash,
      organizationId: org.id,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${ADMIN_EMAIL} (password from ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
