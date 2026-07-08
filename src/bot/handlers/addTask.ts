import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type {
  BotContext,
  BotConversation,
  BotConversationContext,
} from '../context.js';
import { createTask } from '../../services/tasks.js';
import { listAll } from '../../services/users.js';
import {
  recipientChoiceKeyboard,
  recipientsKeyboard,
} from '../keyboards.js';
import { esc } from '../../format.js';

// Conversation id (for ctx.conversation.enter).
export const ADD_TASK_ID = 'addTask';

// Add-task dialog: recipient choice (self / other) -> text -> save.
// "self" => owner === author; "other" => owner is the chosen user.
async function addTaskConversation(
  conversation: BotConversation,
  ctx: BotConversationContext,
) {
  const authorId = ctx.from!.id;
  const authorName = ctx.from!.first_name ?? 'коллега';

  await ctx.reply('➕ <b>Новая задача</b>\n\nКому она предназначена?', {
    reply_markup: recipientChoiceKeyboard(),
  });
  const choiceCtx = await conversation.waitForCallbackQuery(
    /^(who:self|who:other|cancel)$/,
  );
  await choiceCtx.answerCallbackQuery();
  const choice = choiceCtx.match![0];

  if (choice === 'cancel') {
    await choiceCtx.editMessageText('Отменено.');
    return;
  }

  let ownerId = authorId;
  let ownerName = 'себе';

  if (choice === 'who:other') {
    const users = await conversation.external(() => listAll());
    const others = users.filter((u) => u.telegramId !== authorId);

    if (others.length === 0) {
      await choiceCtx.editMessageText(
        'В белом списке пока нет других пользователей.',
      );
      return;
    }

    await choiceCtx.editMessageText('Кому отправить задачу?', {
      reply_markup: recipientsKeyboard(others),
    });

    const recCtx = await conversation.waitForCallbackQuery(
      /^(recv:\d+|cancel)$/,
    );
    await recCtx.answerCallbackQuery();

    if (recCtx.match![0] === 'cancel') {
      await recCtx.editMessageText('Отменено.');
      return;
    }

    ownerId = Number(recCtx.match![0].split(':')[1]);
    const chosen = others.find((u) => u.telegramId === ownerId);
    ownerName = chosen?.name ?? 'получателю';
    await recCtx.editMessageText(`📨 Получатель: <b>${esc(ownerName)}</b>`);
  } else {
    await choiceCtx.editMessageText('👤 Задача — для себя.');
  }

  await ctx.reply('✍️ Напиши текст задачи (или /cancel — отмена):');
  const { message } = await conversation.waitFor('message:text');
  const text = message.text.trim();

  if (text === '/cancel') {
    await ctx.reply('Отменено.');
    return;
  }
  if (text.length === 0) {
    await ctx.reply('Пустая задача — отменяю. Попробуй ещё раз через /add.');
    return;
  }

  // external — the dialog is replayed.
  await conversation.external(() =>
    createTask({ text, ownerId, authorId }),
  );

  if (ownerId === authorId) {
    await ctx.reply(`✅ <b>Задача добавлена!</b>\n\n📌 ${esc(text)}`);
  } else {
    await ctx.reply(
      `✅ <b>Задача отправлена</b> — <b>${esc(ownerName)}</b>.\n\n📌 ${esc(text)}`,
    );
    // Notify the recipient. If they blocked the bot, don't crash the dialog.
    await conversation.external(async (octx) => {
      try {
        await octx.api.sendMessage(
          ownerId,
          `📬 <b>Тебе новая задача</b> от <b>${esc(authorName)}</b>:\n\n📌 ${esc(text)}`,
          { parse_mode: 'HTML' },
        );
      } catch (err) {
        console.error(`Не удалось уведомить получателя ${ownerId}:`, err);
      }
    });
  }
}

export const addTaskHandler = new Composer<BotContext>();

addTaskHandler.use(createConversation(addTaskConversation, ADD_TASK_ID));

// Entry points: /add command and the "Add task" button.
addTaskHandler.command('add', async (ctx) => {
  await ctx.conversation.enter(ADD_TASK_ID);
});

addTaskHandler.callbackQuery('menu:add', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter(ADD_TASK_ID);
});
