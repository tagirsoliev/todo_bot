import 'dotenv/config';
import { z } from 'zod';

// Single source of process.env in the project. On a missing required variable
// the bot exits at startup with a clear error.
const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN обязателен (токен от @BotFather)'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL обязателен (connection string от Neon)'),
  ADMIN_TELEGRAM_ID: z.coerce
    .number()
    .int()
    .positive('ADMIN_TELEGRAM_ID должен быть числовым Telegram-ID'),

  // Optional, with defaults (quiet-hours / cron groundwork).
  TIMEZONE: z.string().default('Asia/Tashkent'),
  WORK_START: z.coerce.number().int().min(0).max(23).default(8),
  WORK_END: z.coerce.number().int().min(0).max(23).default(21),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error('❌ Ошибка конфигурации .env:\n' + issues);
  process.exit(1);
}

export const config = {
  botToken: parsed.data.BOT_TOKEN,
  databaseUrl: parsed.data.DATABASE_URL,
  adminTelegramId: parsed.data.ADMIN_TELEGRAM_ID,

  // Working-hours settings for future auto-broadcast (not used yet).
  timezone: parsed.data.TIMEZONE,
  workStart: parsed.data.WORK_START,
  workEnd: parsed.data.WORK_END,
} as const;
