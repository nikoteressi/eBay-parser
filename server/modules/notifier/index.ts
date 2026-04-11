// ─────────────────────────────────────────────────────────────
// Notification Dispatcher — Public API facade
//
// Orchestrates email and Telegram delivery for a single query.
// Called by the poll-worker after a diff produces new items
// or price drops.
//
// Design (from ARCHITECTURE.md §5.6):
// - Email and Telegram run concurrently (Promise.allSettled)
// - Telegram is serialized internally via its own FIFO queue
// - Each dispatch writes to notification_log for audit
// - Secrets are decrypted from the settings table on demand
//
// See ARCHITECTURE.md §6.1 (sequence diagram, step 7).
// ─────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '../../database/index';
import { settings, notificationLog, trackedItems } from '../../database/schema';
import { decrypt, isEncrypted } from '../../utils/encryption';
import { createLogger } from '../../utils/logger';
import { sendEmail, type SmtpConfig, type EmailPayload } from './email-sender';
import { sendTelegram, type TelegramConfig, type TelegramPayload } from './telegram-sender';
import type { DiffResult, NewItemRecord, PriceDropRecord } from '../diff-engine/index';

const log = createLogger('notifier');

// ─────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────

export { sendEmail, testSmtpConnection, resetTransporter, type SmtpConfig } from './email-sender';
export { sendTelegram, testTelegramConnection, TelegramApiError, type TelegramConfig } from './telegram-sender';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface QueryInfo {
  id: string;
  label: string | null;
  keywords: string;
  notifyChannel: 'email' | 'telegram' | 'both';
}

export interface DispatchResult {
  emailSent: boolean;
  telegramSent: boolean;
  emailError?: string;
  telegramError?: string;
}

// ─────────────────────────────────────────────────────────────
// Settings Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Reads a setting value, decrypting if it's a secret.
 */
function readSetting(key: string): string | undefined {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return undefined;

  if (row.isSecret && isEncrypted(row.value)) {
    try {
      return decrypt(row.value);
    } catch {
      log.error(`Failed to decrypt "${key}" — re-save this setting via the UI`);
      return undefined;
    }
  }
  return row.value;
}

/**
 * Builds SMTP config from settings table.
 * Returns null if required fields are missing.
 */
function buildSmtpConfig(): SmtpConfig | null {
  const host = readSetting('smtp.host');
  const port = readSetting('smtp.port');
  const username = readSetting('smtp.username');
  const password = readSetting('smtp.password');
  const from = readSetting('smtp.from');
  const to = readSetting('smtp.to');
  const useTls = readSetting('smtp.use_tls');
  const enabled = readSetting('smtp.enabled');

  if (enabled !== 'true') {
    log.debug('Email notifications disabled in settings');
    return null;
  }

  if (!host || !port || !username || !password || !from || !to) {
    log.warn('SMTP settings incomplete — skipping email');
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    username,
    password,
    useTls: useTls === 'true',
    from,
    to,
  };
}

/**
 * Builds Telegram config from settings table.
 * Returns null if required fields are missing.
 */
function buildTelegramConfig(): TelegramConfig | null {
  const botToken = readSetting('telegram.bot_token');
  const chatId = readSetting('telegram.chat_id');
  const enabled = readSetting('telegram.enabled');

  if (enabled !== 'true') {
    log.debug('Telegram notifications disabled in settings');
    return null;
  }

  if (!botToken || !chatId) {
    log.warn('Telegram settings incomplete — skipping Telegram');
    return null;
  }

  return { botToken, chatId };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Dispatches notifications for a single query's diff results.
 *
 * This is the function that `poll-worker.ts` calls after
 * `computeDiff()` returns new items or price drops.
 *
 * 1. Builds email and Telegram configs from settings.
 * 2. Dispatches to the appropriate channels (based on query.notifyChannel).
 * 3. Email and Telegram run concurrently (Promise.allSettled).
 * 4. Logs results to notification_log table.
 * 5. Marks items as notified (notified_new, last_notified_price).
 *
 * @param query      — Query metadata (id, label, notifyChannel).
 * @param diffResult — Diff output with new items and price drops.
 * @returns Dispatch result with per-channel success/error.
 */
export async function dispatch(
  query: QueryInfo,
  diffResult: DiffResult,
): Promise<DispatchResult> {
  const { newItems, priceDrops } = diffResult;
  const now = new Date().toISOString();

  // Nothing to notify — shouldn't be called, but guard anyway
  if (newItems.length === 0 && priceDrops.length === 0) {
    log.debug(`No items to notify for query ${query.id}`);
    return { emailSent: false, telegramSent: false };
  }

  const result: DispatchResult = {
    emailSent: false,
    telegramSent: false,
  };

  const shouldEmail = query.notifyChannel === 'email' || query.notifyChannel === 'both';
  const shouldTelegram = query.notifyChannel === 'telegram' || query.notifyChannel === 'both';

  const payload = {
    queryLabel: query.label || query.keywords,
    queryKeywords: query.keywords,
    newItems,
    priceDrops,
  };

  // ── Dispatch concurrently ──
  const promises: Promise<void>[] = [];

  if (shouldEmail) {
    promises.push(
      dispatchEmail(payload, query.id, now, result),
    );
  }

  if (shouldTelegram) {
    promises.push(
      dispatchTelegram(payload, query.id, now, result),
    );
  }

  await Promise.allSettled(promises);

  // ── Mark items as notified ──
  markItemsNotified(newItems, priceDrops);

  log.info(
    `Dispatch complete for query ${query.id}: ` +
      `email=${result.emailSent}, telegram=${result.telegramSent}`,
  );

  return result;
}

// ─────────────────────────────────────────────────────────────
// Internal Dispatch Helpers
// ─────────────────────────────────────────────────────────────

async function dispatchEmail(
  payload: EmailPayload,
  queryId: string,
  now: string,
  result: DispatchResult,
): Promise<void> {
  const smtpConfig = buildSmtpConfig();
  if (!smtpConfig) return;

  try {
    await sendEmail(smtpConfig, payload);
    result.emailSent = true;

    // Log success
    db.insert(notificationLog)
      .values({
        id: ulid(),
        queryId,
        channel: 'email',
        newItemsCount: payload.newItems.length,
        priceDropsCount: payload.priceDrops.length,
        status: 'sent',
        sentAt: now,
      })
      .run();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.emailError = msg;

    // Log failure
    db.insert(notificationLog)
      .values({
        id: ulid(),
        queryId,
        channel: 'email',
        newItemsCount: payload.newItems.length,
        priceDropsCount: payload.priceDrops.length,
        status: 'failed',
        errorMessage: msg,
        sentAt: now,
      })
      .run();

    log.error(`Email dispatch failed for query ${queryId}: ${msg}`);
  }
}

async function dispatchTelegram(
  payload: TelegramPayload,
  queryId: string,
  now: string,
  result: DispatchResult,
): Promise<void> {
  const telegramConfig = buildTelegramConfig();
  if (!telegramConfig) return;

  try {
    await sendTelegram(telegramConfig, payload);
    result.telegramSent = true;

    // Log success
    db.insert(notificationLog)
      .values({
        id: ulid(),
        queryId,
        channel: 'telegram',
        newItemsCount: payload.newItems.length,
        priceDropsCount: payload.priceDrops.length,
        status: 'sent',
        sentAt: now,
      })
      .run();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.telegramError = msg;

    // Log failure
    db.insert(notificationLog)
      .values({
        id: ulid(),
        queryId,
        channel: 'telegram',
        newItemsCount: payload.newItems.length,
        priceDropsCount: payload.priceDrops.length,
        status: 'failed',
        errorMessage: msg,
        sentAt: now,
      })
      .run();

    log.error(`Telegram dispatch failed for query ${queryId}: ${msg}`);
  }
}

/**
 * Marks new items with notified_new=true and updates
 * last_notified_price for price-dropped items.
 *
 * This runs synchronously after both channels have completed
 * (or failed) to avoid partial notification state.
 */
function markItemsNotified(
  newItems: NewItemRecord[],
  priceDrops: PriceDropRecord[],
): void {
  const now = new Date().toISOString();

  for (const item of newItems) {
    db.update(trackedItems)
      .set({ notifiedNew: true })
      .where(eq(trackedItems.id, item.id))
      .run();
  }

  for (const drop of priceDrops) {
    db.update(trackedItems)
      .set({ lastNotifiedPrice: drop.currentTotalCost })
      .where(eq(trackedItems.id, drop.id))
      .run();
  }

  if (newItems.length > 0 || priceDrops.length > 0) {
    log.debug(
      `Marked ${newItems.length} items as notified_new, ` +
        `${priceDrops.length} items with updated last_notified_price`,
    );
  }
}
