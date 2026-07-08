import { createBot } from './bot/bot.js';

// v1 entry point: long polling. Switching to webhooks changes only this file;
// business logic (services/*) and bot assembly (bot.ts) stay the same.
async function main() {
  const bot = createBot();

  await bot.api.setMyCommands([
    { command: 'start', description: 'Главное меню' },
    { command: 'add', description: 'Добавить задачу' },
    { command: 'list', description: 'Мои задачи' },
    { command: 'help', description: 'Помощь' },
  ]);

  const stop = () => {
    console.log('\n⏹  Останавливаю бота...');
    void bot.stop();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  console.log('🤖 Бот запускается (long polling)...');
  await bot.start({
    onStart: (info) => console.log(`✅ Бот @${info.username} запущен.`),
  });
}

main().catch((err) => {
  console.error('💥 Не удалось запустить бота:', err);
  process.exit(1);
});
