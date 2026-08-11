import 'dotenv/config';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users } from './schema.js';

const BCRYPT_ROUNDS = 12;

async function seed() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL is required');
    process.exit(1);
  }
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is required');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters');
    process.exit(1);
  }

  const db = drizzle(DATABASE_URL);

  // Check if an admin already exists (by role or email)
  const existingAdmin = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log(
      `Admin account already exists (${existingAdmin[0]!.email}). Skipping seed.`,
    );
    process.exit(0);
  }

  const existingEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existingEmail.length > 0) {
    console.error(
      `A user with email "${ADMIN_EMAIL}" already exists but is not an admin. Resolve manually.`,
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await db.insert(users).values({
    username: 'admin',
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
  });

  console.log(`Admin account seeded: ${ADMIN_EMAIL}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
