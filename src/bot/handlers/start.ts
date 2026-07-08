import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { mainMenuKeyboard } from '../keyboards.js';
import { esc } from '../../format.js';

export const startHandler = new Composer<BotContext>();

// /start and /help. By now the whitelist middleware has let the user through
// and set ctx.user (the admin is self-registered there on first contact).
async function showMenu(ctx: BotContext) {
  const { user } = ctx;
  const greeting =
    `👋 Привет, <b>${esc(user.name)}</b>!\n\n` +
    `Я <b>бот-напоминалка задач</b>. Помогу не забыть свои дела ` +
    `и передать задачу коллеге.\n\n` +
    `Выбери действие 👇`;
  await ctx.reply(greeting, {
    reply_markup: mainMenuKeyboard(user.isAdmin),
  });
}

startHandler.command('start', showMenu);
startHandler.command('help', showMenu);

// "Home" button from inline keyboards.
startHandler.callbackQuery('menu:home', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMenu(ctx);
});
