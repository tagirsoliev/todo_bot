import type { Api } from 'grammy';
import { sendRemindersToAll } from '../services/reminders.js';
import { isWorkingHour } from './quietHours.js';

// Entry point for a future automatic hourly broadcast. Checks quiet hours and,
// during working hours, calls the same services/reminders.sendRemindersToAll as
// the "Broadcast to all" button. Not invoked anywhere yet; intended for an
// external cron hitting an /api/reminders route on the webhook setup.
export async function runScheduledReminders(api: Api): Promise<void> {
  if (!isWorkingHour()) {
    console.log('🔕 Тихие часы — авторассылка пропущена.');
    return;
  }
  const result = await sendRemindersToAll(api);
  console.log(
    `⏰ Авторассылка: отправлено ${result.sent}/${result.total}, ошибок ${result.failed}.`,
  );
}
