import { db } from '../../database/index';
import { settings as settingsTable } from '../../database/schema';
import { maskSecret } from '../../utils/encryption';

export default defineEventHandler(async () => {
  const allSettings = db.select().from(settingsTable).all();
  
  const formatted: Record<string, string> = {};
  for (const row of allSettings) {
    if (row.isSecret) {
      formatted[row.key] = maskSecret(row.value);
    } else {
      formatted[row.key] = row.value;
    }
  }

  return formatted;
});
