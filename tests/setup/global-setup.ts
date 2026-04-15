import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';

const TEST_DB = '/tmp/test-db.sqlite';

export default function setup() {
  for (const suffix of ['', '-shm', '-wal']) {
    const path = `${TEST_DB}${suffix}`;
    if (existsSync(path)) unlinkSync(path);
  }

  execSync('npx drizzle-kit push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_PATH: TEST_DB },
  });
}