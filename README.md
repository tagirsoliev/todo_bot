# Reminder Bot — Telegram Task Reminder

A Telegram bot for managing tasks within a team via an access whitelist: assigning
tasks to oneself or to colleagues, marking completion, editing, deletion, and
broadcasting reminders.

**Technology stack:** [grammY](https://grammy.dev) · [Neon](https://neon.com)
(serverless Postgres) · [Drizzle ORM](https://orm.drizzle.team) · long polling.


---

## Features

Any whitelisted user may:
- add a task for themselves or assign one to another user;
- view their list of outstanding tasks with inline actions — **Done**, **Edit**,
  **Delete** (editing and deletion are available to the task author only);
- receive a notification when a task is assigned to them.

An administrator may additionally:
- broadcast to every user their individual list of outstanding tasks;
- manage the whitelist via `/adduser`, `/removeuser`, and `/users`.

---

## Prerequisites

The following credentials must be obtained before running the bot.

### 1. Bot token (@BotFather)
1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow the prompts (bot display name and username).
3. BotFather returns a token of the form `123456789:AA...`; this is `BOT_TOKEN`.

### 2. Telegram user ID (@userinfobot)
1. Open [@userinfobot](https://t.me/userinfobot) and send any message.
2. The reply contains a numeric **Id**; this is `ADMIN_TELEGRAM_ID`. The user with
   this ID is automatically granted administrator rights on their first `/start`.

### 3. Neon database
1. Register at [neon.com](https://neon.com) (free tier available).
2. Create a project (**New Project**).
3. From the dashboard, open **Connection Details** and copy the **connection string**
   (of the form `postgresql://user:password@ep-xxx.aws.neon.tech/dbname?sslmode=require`);
   this is `DATABASE_URL`.

---

## Configuration (`.env`)

Copy the template and populate it with the values obtained above:

```bash
cp .env.example .env
```

| Variable              | Required | Description                                                    |
|-----------------------|:--------:|----------------------------------------------------------------|
| `BOT_TOKEN`           | Yes      | Bot token from @BotFather                                       |
| `DATABASE_URL`        | Yes      | Neon connection string (including `?sslmode=require`)          |
| `ADMIN_TELEGRAM_ID`   | Yes      | Administrator's Telegram ID (granted admin on first `/start`)  |
| `TIMEZONE`            | No       | Quiet-hours time zone (default `Asia/Tashkent`)               |
| `WORK_START`          | No       | Start of working hours, 0–23 (default `8`)                    |
| `WORK_END`            | No       | End of working hours, 0–23 (default `21`)                     |

> The `.env` file is excluded from version control (see `.gitignore`). Only
> `.env.example`, containing placeholder values, is committed to the repository.

---

## Installation and Execution

```bash
# 1. Install dependencies
npm install

# 2. Apply migrations (create tables in the Neon database)
npm run db:migrate

# 3a. Development mode (automatic reload on changes)
npm run dev

# 3b. Production mode
npm run build      # compile TypeScript to dist/
npm start          # node dist/index.js
```

Once the bot is running, open it in Telegram and send `/start`.

### npm scripts
| Script                | Description                                          |
|-----------------------|------------------------------------------------------|
| `npm run dev`         | Run with automatic reload (`tsx watch`)              |
| `npm run build`       | Compile to `dist/`                                   |
| `npm start`           | Run the compiled build                               |
| `npm run typecheck`   | Type-check without emitting output                   |
| `npm run db:generate` | Generate an SQL migration from schema changes        |
| `npm run db:migrate`  | Apply migrations to the database                     |
| `npm run db:studio`   | Drizzle Studio — inspect and edit data in a browser  |

---

## Project Structure

```
src/
  index.ts              # entry point: starts long polling
  config.ts             # reads and validates .env (zod)
  format.ts             # text escaping for HTML messages
  db/
    schema.ts           # Drizzle schema (users, tasks)
    client.ts           # Neon connection
    migrate.ts          # migration runner
  bot/
    bot.ts              # bot assembly: whitelist middleware, handler registration
    context.ts          # context types
    keyboards.ts        # inline keyboards
    handlers/
      start.ts          # /start, /help, menu
      addTask.ts        # task creation (self / other)
      listTasks.ts      # task list and "Done" action
      editTask.ts       # editing and deletion
      broadcast.ts      # "Broadcast to all" (admin)
      admin.ts          # whitelist management (admin)
  services/
    users.ts            # whitelist logic
    tasks.ts            # task logic (CRUD and permissions)
    reminders.ts        # reminder composition and delivery (used by the button and a future cron job)
  scheduler/
    quietHours.ts       # working-hours check (implemented, not yet invoked)
    autoReminders.ts    # automatic-broadcast scaffold (implemented, not yet invoked)
drizzle/                # SQL migrations
```

**Architectural principle.** All reminder logic resides in `services/reminders.ts`.
The "Broadcast to all" button and a future cron job invoke the same functions, avoiding
duplication. The execution mechanism (long polling) is isolated in `index.ts`, so a
migration to webhooks would affect that file alone.

---

## Bot Commands

| Command                        | Access | Description                              |
|--------------------------------|--------|------------------------------------------|
| `/start`, `/help`              | all    | Main menu                                |
| `/add`                         | all    | Add a task                               |
| `/list`                        | all    | View outstanding tasks                   |
| `/broadcast`                   | admin  | Broadcast reminders to all users         |
| `/users`                       | admin  | Display the whitelist                    |
| `/adduser <telegram_id> <name>`| admin  | Add a user                               |
| `/removeuser <telegram_id>`    | admin  | Remove a user (with confirmation)        |

---

## Technical Notes

- **Task permissions** are enforced at the SQL level (`services/tasks.ts`): only the
  owner may mark a task complete, and only the author may edit or delete it. Forging
  `callback_data` cannot affect another user's task.
- **Broadcast resilience:** if a user has blocked the bot, the error is logged and does
  not interrupt delivery to the remaining users.
- **Security:** all secrets are read exclusively from `.env`; user-supplied text is
  escaped before insertion into HTML messages.
```

> This project was developed with [Claude Code](https://claude.com/claude-code).