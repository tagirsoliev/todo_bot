import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { taskKeyboard } from '../keyboards.js';
import { esc } from '../../format.js';
import { listOpenForOwner, markDone } from '../../services/tasks.js';
import { listAll } from '../../services/users.js';

export const listTasksHandler = new Composer<BotContext>();

// Show the user's outstanding tasks, one message each with its buttons.
async function showList(ctx: BotContext) {
  const me = ctx.user.telegramId;
  const openTasks = await listOpenForOwner(me);

  if (openTasks.length === 0) {
    await ctx.reply('📭 <b>Задач нет.</b> Отличная работа! 👍');
    return;
  }

  // id -> name map to label tasks assigned by someone else.
  const users = await listAll();
  const nameById = new Map(users.map((u) => [u.telegramId, u.name]));

  await ctx.reply(`📋 <b>Твои задачи</b> — ${openTasks.length} шт.`);
  for (const task of openTasks) {
    const isAuthor = task.authorId === me;
    const from = isAuthor
      ? ''
      : `\n<i>👤 от ${esc(nameById.get(task.authorId) ?? 'кого-то')}</i>`;
    await ctx.reply(`📌 ${esc(task.text)}${from}`, {
      reply_markup: taskKeyboard(task, isAuthor),
    });
  }
}

listTasksHandler.command('list', showList);

listTasksHandler.callbackQuery('menu:list', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showList(ctx);
});

// "Done" button — mark a task complete (owner only).
listTasksHandler.callbackQuery(/^done:(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  const done = await markDone(id, ctx.user.telegramId);

  if (!done) {
    // not found / not owner / already done
    await ctx.answerCallbackQuery({ text: 'Не удалось отметить задачу.' });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'Отмечено ✅' });
  await ctx.editMessageText(`✅ <s>${esc(done.text)}</s>`);
});
