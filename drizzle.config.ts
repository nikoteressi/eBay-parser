import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/ebay-tracker.db',
  },
});
