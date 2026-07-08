import { Bot, type Transformer } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { config } from '../config.js';
import type { BotContext, BotConversationContext } from './context.js';
import { getByTelegramId, addToWhitelist } from '../services/users.js';
import { startHandler } from './handlers/start.js';
import { addTaskHandler } from './handlers/addTask.js';
import { listTasksHandler } from './handlers/listTasks.js';
import { editTaskHandler } from './handlers/editTask.js';
import { broadcastHandler } from './handlers/broadcast.js';
import { adminHandler } from './handlers/admin.js';

// Default HTML formatting. Installed both on bot.api and, via the conversations
// plugins option, on the inner Api of dialogs — otherwise dialog messages would
// send <b> tags as plain text. User text is escaped with format.esc().
const htmlByDefault: Transformer = (prev, method, payload, signal) => {
  if (
    (method === 'sendMessage' || method === 'editMessageText') &&
    payload &&
    !('parse_mode' in payload)
  ) {
    (payload as { parse_mode?: string }).parse_mode = 'HTML';
  }
  return prev(method, payload, signal);
};

// Assembles and configures the bot. The launch mechanism (long polling / webhook)
// lives separately in index.ts.
export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.botToken);

  bot.api.config.use(htmlByDefault);

  // In-memory conversation state (fine for long polling; set storage for serverless).
  bot.use(
    conversations({
      plugins: [
        async (ctx: BotConversationContext, next) => {
          ctx.api.config.use(htmlByDefault);
          await next();
        },
      ],
    }),
  );

  // Whitelist middleware: only users present in the `users` table pass through.
  // The admin is self-registered on first contact (is_admin = true).
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return; // ignore service updates without a sender

    let user = await getByTelegramId(from.id);

    if (!user && from.id === config.adminTelegramId) {
      const name = from.first_name || from.username || 'Админ';
      const res = await addToWhitelist(from.id, name, true);
      user = res.user;
      console.log(`👑 Админ ${name} (${from.id}) саморегистрирован.`);
    }

    if (!user) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: 'У вас нет доступа к этому боту 🚫',
          show_alert: true,
        });
      } else if (ctx.message) {
        await ctx.reply('Извините, у вас нет доступа к этому боту. 🚫');
      }
      return;
    }

    ctx.user = user;
    await next();
  });

  bot.use(startHandler);
  bot.use(addTaskHandler);
  bot.use(listTasksHandler);
  bot.use(editTaskHandler);
  bot.use(broadcastHandler);
  bot.use(adminHandler);

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(
      `❌ Ошибка при обработке апдейта ${ctx.update.update_id}:`,
      err.error,
    );
  });

  return bot;
}
