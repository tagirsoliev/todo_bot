import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type {
  BotContext,
  BotConversation,
  BotConversationContext,
} from '../context.js';
import { confirmDeleteKeyboard, taskKeyboard } from '../keyboards.js';
import { esc } from '../../format.js';
import {
  deleteTask,
  getTaskById,
  updateText,
} from '../../services/tasks.js';

// Edit conversation id.
export const EDIT_TASK_ID = 'editTask';

// Edit-text dialog; taskId is passed on enter. Author only (checked here and in
// the SQL of updateText).
async function editTaskConversation(
  conversation: BotConversation,
  ctx: BotConversationContext,
  taskId: number,
) {
  const authorId = ctx.from!.id;

  const task = await conversation.external(() => getTaskById(taskId));
  if (!task || task.authorId !== authorId) {
    await ctx.reply('Эту задачу нельзя изменить (не найдена или ты не автор).');
    return;
  }

  await ctx.reply(
    `✏️ <b>Изменение задачи</b>\n\nСейчас: 📌 ${esc(task.text)}\n\n` +
      `Напиши новый текст (или /cancel — отмена):`,
  );

  const { message } = await conversation.waitFor('message:text');
  const text = message.text.trim();

  if (text === '/cancel') {
    await ctx.reply('Отменено, текст не изменён.');
    return;
  }
  if (text.length === 0) {
    await ctx.reply('Пустой текст — отменяю.');
    return;
  }

  const updated = await conversation.external(() =>
    updateText(taskId, authorId, text),
  );
  await ctx.reply(
    updated
      ? `✅ <b>Обновлено!</b>\n\n📌 ${esc(text)}`
      : 'Не удалось изменить задачу.',
  );
}

export const editTaskHandler = new Composer<BotContext>();

editTaskHandler.use(createConversation(editTaskConversation, EDIT_TASK_ID));

// "Edit" button — enter the dialog with the task id.
editTaskHandler.callbackQuery(/^edit:(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter(EDIT_TASK_ID, id);
});

// "Delete" button — show confirmation (swap the keyboard only).
editTaskHandler.callbackQuery(/^del:(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup({ reply_markup: confirmDeleteKeyboard(id) });
});

// Confirm deletion — delete (author only).
editTaskHandler.callbackQuery(/^delyes:(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  const ok = await deleteTask(id, ctx.user.telegramId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: 'Не удалось удалить.' });
    return;
  }
  await ctx.answerCallbackQuery({ text: 'Удалено 🗑' });
  await ctx.editMessageText('🗑 Задача удалена.');
});

// Cancel deletion — restore the normal task keyboard.
editTaskHandler.callbackQuery(/^delno:(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  await ctx.answerCallbackQuery({ text: 'Отменено' });
  const task = await getTaskById(id);
  if (task) {
    const isAuthor = task.authorId === ctx.user.telegramId;
    await ctx.editMessageReplyMarkup({
      reply_markup: taskKeyboard(task, isAuthor),
    });
  }
});
