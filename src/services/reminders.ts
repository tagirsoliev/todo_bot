import type { Api } from 'grammy';
import type { User } from '../db/schema.js';
import { esc } from '../format.js';
import { listAll } from './users.js';
import { listOpenForOwner } from './tasks.js';

// Reminder composition and delivery.
//
// Architecture: all broadcast logic lives here. The "Broadcast to all" button
// and a future hourly cron call the same functions — no duplication. They take
// `api` (bot.api) rather than a request context, so they work identically from
// a handler and from an external scheduler.

// Reminder text for one user (or the "all done" message).
function formatReminder(tasks: { text: string }[]): string {
  if (tasks.length === 0) {
    return 'Все задачи выполнены 👍';
  }
  const lines = tasks.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
  return `📋 Твои невыполненные задачи (${tasks.length}):\n\n${lines}`;
}

// Send one user their individual list of outstanding tasks. Throws if delivery
// fails (e.g. the bot is blocked); the caller decides how to react.
export async function sendReminderToUser(
  api: Api,
  user: User,
): Promise<void> {
  const tasks = await listOpenForOwner(user.telegramId);
  await api.sendMessage(user.telegramId, formatReminder(tasks));
}

// Broadcast summary for reporting.
export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
}

// Broadcast reminders to every whitelisted user. A delivery failure for one
// user does not stop the rest: it is logged and counted in `failed`.
export async function sendRemindersToAll(api: Api): Promise<BroadcastResult> {
  const users = await listAll();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await sendReminderToUser(api, user);
      sent++;
    } catch (err) {
      failed++;
      console.error(
        `Не удалось отправить напоминание пользователю ${user.telegramId} (${user.name}):`,
        err,
      );
    }
  }

  return { total: users.length, sent, failed };
}
