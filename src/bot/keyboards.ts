import { InlineKeyboard } from 'grammy';
import type { Task } from '../db/schema.js';

// Main menu. "Broadcast to all" is shown to admins only.
export function mainMenuKeyboard(isAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('➕ Добавить задачу', 'menu:add')
    .row()
    .text('📋 Мои задачи', 'menu:list')
    .row();

  if (isAdmin) {
    kb.text('📢 Отправить всем', 'menu:broadcast').row();
  }

  return kb;
}

// Keyboard under a single task. Edit/Delete are shown to the author only.
export function taskKeyboard(task: Task, isAuthor: boolean): InlineKeyboard {
  const kb = new InlineKeyboard().text('✅ Сделал', `done:${task.id}`);
  if (isAuthor) {
    kb.text('✏️ Изменить', `edit:${task.id}`).text('🗑 Удалить', `del:${task.id}`);
  }
  return kb;
}

// Recipient choice for a new task: self / other.
export function recipientChoiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👤 Себе', 'who:self')
    .text('👥 Другому', 'who:other')
    .row()
    .text('✖️ Отмена', 'cancel');
}

// Whitelist recipients, one button per user.
export function recipientsKeyboard(
  users: { telegramId: number; name: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const u of users) {
    kb.text(u.name, `recv:${u.telegramId}`).row();
  }
  kb.text('✖️ Отмена', 'cancel');
  return kb;
}

// Task deletion confirmation.
export function confirmDeleteKeyboard(taskId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('🗑 Да, удалить', `delyes:${taskId}`)
    .text('↩️ Отмена', `delno:${taskId}`);
}

// Whitelist-user removal confirmation (admin).
export function confirmRemoveUserKeyboard(telegramId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('🗑 Да, удалить', `rmuser:${telegramId}`)
    .text('↩️ Отмена', 'rmuser:cancel');
}
