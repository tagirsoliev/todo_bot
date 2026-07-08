import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit config: schema location, migrations output, DB credentials.
// DATABASE_URL is read from .env directly (dotenv/config above) as this file
// runs the drizzle-kit CLI outside the bot runtime.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
