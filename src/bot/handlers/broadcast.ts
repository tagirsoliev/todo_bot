import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { sendRemindersToAll } from '../../services/reminders.js';

export const broadcastHandler = new Composer<BotContext>();

// Run the broadcast and report to the admin. The "Broadcast to all" button just
// calls services/reminders — the same function a cron will call later.
async function runBroadcast(ctx: BotContext) {
  const result = await sendRemindersToAll(ctx.api);
  await ctx.reply(
    `📢 <b>Рассылка завершена</b>\n\n` +
      `✅ Отправлено: <b>${result.sent}</b> из <b>${result.total}</b>` +
      (result.failed > 0 ? `\n⚠️ Не доставлено: <b>${result.failed}</b>` : ''),
  );
}

// "Broadcast to all" button.
broadcastHandler.callbackQuery('menu:broadcast', async (ctx) => {
  if (!ctx.user.isAdmin) {
    await ctx.answerCallbackQuery({ text: 'Только для админа 🚫' });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Рассылаю...' });
  await runBroadcast(ctx);
});

// Duplicate command for convenience.
broadcastHandler.command('broadcast', async (ctx) => {
  if (!ctx.user.isAdmin) {
    await ctx.reply('Эта команда доступна только админу. 🚫');
    return;
  }
  await runBroadcast(ctx);
});
