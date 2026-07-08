import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tasks, type Task } from '../db/schema.js';

// Create a task. For a self-assigned task ownerId === authorId.
export async function createTask(params: {
  text: string;
  ownerId: number;
  authorId: number;
}): Promise<Task> {
  const [created] = await db
    .insert(tasks)
    .values({
      text: params.text,
      ownerId: params.ownerId,
      authorId: params.authorId,
    })
    .returning();
  return created!;
}

// A user's outstanding tasks (as recipient), oldest first.
export async function listOpenForOwner(ownerId: number): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.ownerId, ownerId), eq(tasks.isDone, false)))
    .orderBy(asc(tasks.createdAt));
}

// A task by id (or undefined).
export async function getTaskById(id: number): Promise<Task | undefined> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0];
}

// Mark a task done. Owner only. Returns the updated task, or undefined
// (not found / not owner / already done).
export async function markDone(
  id: number,
  ownerTelegramId: number,
): Promise<Task | undefined> {
  const [updated] = await db
    .update(tasks)
    .set({ isDone: true })
    .where(
      and(
        eq(tasks.id, id),
        eq(tasks.ownerId, ownerTelegramId),
        eq(tasks.isDone, false),
      ),
    )
    .returning();
  return updated;
}

// Update task text. Author only. Returns the updated task, or undefined
// (not found / not author).
export async function updateText(
  id: number,
  authorTelegramId: number,
  text: string,
): Promise<Task | undefined> {
  const [updated] = await db
    .update(tasks)
    .set({ text })
    .where(and(eq(tasks.id, id), eq(tasks.authorId, authorTelegramId)))
    .returning();
  return updated;
}

// Delete a task. Author only. Returns true if a row was deleted.
export async function deleteTask(
  id: number,
  authorTelegramId: number,
): Promise<boolean> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.authorId, authorTelegramId)))
    .returning({ id: tasks.id });
  return deleted.length > 0;
}
