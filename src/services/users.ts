import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, type User } from '../db/schema.js';

// Find a whitelisted user by Telegram id (or undefined).
export async function getByTelegramId(
  telegramId: number,
): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return rows[0];
}

// The whole whitelist, ordered by name.
export async function listAll(): Promise<User[]> {
  return db.select().from(users).orderBy(users.name);
}

// Add a user to the whitelist. Idempotent: updates the name on an existing
// telegram_id. Returns { user, created }.
export async function addToWhitelist(
  telegramId: number,
  name: string,
  isAdmin = false,
): Promise<{ user: User; created: boolean }> {
  const existing = await getByTelegramId(telegramId);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ name })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return { user: updated ?? existing, created: false };
  }
  const [created] = await db
    .insert(users)
    .values({ telegramId, name, isAdmin })
    .returning();
  return { user: created!, created: true };
}

// Remove a user from the whitelist. Returns true if a row was deleted.
export async function removeFromWhitelist(telegramId: number): Promise<boolean> {
  const deleted = await db
    .delete(users)
    .where(eq(users.telegramId, telegramId))
    .returning({ id: users.id });
  return deleted.length > 0;
}
