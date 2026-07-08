import { Composer } from 'grammy';
import type { BotContext } from '../context.js';
import { config } from '../../config.js';
import { confirmRemoveUserKeyboard } from '../keyboards.js';
import { esc } from '../../format.js';
import {
  addToWhitelist,
  getByTelegramId,
  listAll,
  removeFromWhitelist,
} from '../../services/users.js';

export const adminHandler = new Composer<BotContext>();

// All commands below are admin-only.
const admin = adminHandler.filter((ctx) => ctx.user.isAdmin);

// /users — show the whitelist.
admin.command('users', async (ctx) => {
  const users = await listAll();
  if (users.length === 0) {
    await ctx.reply('Белый список пуст.');
    return;
  }
  const lines = users.map(
    (u) =>
      `${u.isAdmin ? '👑' : '•'} <b>${esc(u.name)}</b> — <code>${u.telegramId}</code>`,
  );
  await ctx.reply(
    `👥 <b>Белый список</b> — ${users.length} чел.\n\n` + lines.join('\n'),
  );
});

// /adduser <telegram_id> <name> — add or update a user.
admin.command('adduser', async (ctx) => {
  const parts = ctx.match.trim().split(/\s+/);
  const idRaw = parts[0];
  const name = parts.slice(1).join(' ').trim();

  const telegramId = Number(idRaw);
  if (!idRaw || !Number.isInteger(telegramId) || telegramId <= 0) {
    await ctx.reply(
      'Формат: /adduser <telegram_id> <имя>\nНапример: /adduser 123456789 Алиса',
    );
    return;
  }
  if (!name) {
    await ctx.reply('Укажи имя пользователя: /adduser <telegram_id> <имя>');
    return;
  }

  const { user, created } = await addToWhitelist(telegramId, name);
  await ctx.reply(
    created
      ? `✅ <b>Добавлен:</b> ${esc(user.name)} — <code>${user.telegramId}</code>`
      : `♻️ <b>Обновлено имя:</b> ${esc(user.name)} — <code>${user.telegramId}</code>`,
  );
});

// /removeuser <telegram_id> — remove with confirmation.
admin.command('removeuser', async (ctx) => {
  const idRaw = ctx.match.trim();
  const telegramId = Number(idRaw);

  if (!idRaw || !Number.isInteger(telegramId) || telegramId <= 0) {
    await ctx.reply('Формат: /removeuser <telegram_id>');
    return;
  }
  if (telegramId === config.adminTelegramId) {
    await ctx.reply('Нельзя удалить главного админа. 🚫');
    return;
  }

  const target = await getByTelegramId(telegramId);
  if (!target) {
    await ctx.reply('Такого пользователя нет в белом списке.');
    return;
  }

  await ctx.reply(
    `❓ Удалить из белого списка: <b>${esc(target.name)}</b> — <code>${target.telegramId}</code>?`,
    { reply_markup: confirmRemoveUserKeyboard(target.telegramId) },
  );
});

// User-removal confirmation.
admin.callbackQuery(/^rmuser:(cancel|\d+)$/, async (ctx) => {
  const arg = ctx.match[1]!;

  if (arg === 'cancel') {
    await ctx.answerCallbackQuery({ text: 'Отменено' });
    await ctx.editMessageText('Отменено.');
    return;
  }

  const telegramId = Number(arg);
  if (telegramId === config.adminTelegramId) {
    await ctx.answerCallbackQuery({ text: 'Нельзя удалить админа' });
    return;
  }

  const ok = await removeFromWhitelist(telegramId);
  await ctx.answerCallbackQuery({ text: ok ? 'Удалено 🗑' : 'Не найдено' });
  await ctx.editMessageText(
    ok ? '🗑 Пользователь удалён из белого списка.' : 'Пользователь не найден.',
  );
});
