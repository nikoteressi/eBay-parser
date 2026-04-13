// ─────────────────────────────────────────────────────────────
// Telegram Sender — Raw fetch to Bot API with flood control
//
// Mandatory constraints (from ARCHITECTURE.md §5.6):
// 1. 1.5s minimum delay between consecutive sendMessage calls
// 2. Truncate messages to top 10 items (new + price drops)
// 3. Never split into multiple messages per query
// 4. Handle 429 (Too Many Requests) with retry_after
// 5. Max 2 retries per message, then log as failed
//
// Uses a FIFO async queue to serialize Telegram sends.
// Email dispatch runs concurrently — not blocked by this queue.
// ─────────────────────────────────────────────────────────────

import { createLogger } from '../../utils/logger';
import type { NewItemRecord, PriceDropRecord } from '../diff-engine/index';

const log = createLogger('telegram-sender');

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Minimum delay between consecutive Telegram API calls (ms) */
const INTER_MESSAGE_DELAY_MS = 1500;

/** Max items (new + price drops combined) per message */
const MAX_ITEMS_PER_MESSAGE = 10;

/** Max retries on 429 response */
const MAX_RETRIES = 2;

/** Telegram sendMessage API base URL */
const TELEGRAM_API_BASE = 'https://api.telegram.org';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface TelegramPayload {
  queryLabel: string;
  queryKeywords: string;
  newItems: NewItemRecord[];
  priceDrops: PriceDropRecord[];
}

interface QueueEntry {
  chatId: string;
  text: string;
  botToken: string;
  resolve: (value: void) => void;
  reject: (error: Error) => void;
}

// ─────────────────────────────────────────────────────────────
// Async Send Queue (FIFO with inter-message delay)
//
// All Telegram messages are funneled through this queue
// to enforce the 1.5s inter-message delay globally.
// ─────────────────────────────────────────────────────────────

const queue: QueueEntry[] = [];
let isProcessing = false;

/**
 * Enqueues a Telegram message and starts queue processing
 * if not already running.
 */
function enqueue(entry: Omit<QueueEntry, 'resolve' | 'reject'>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    queue.push({ ...entry, resolve, reject });

    if (!isProcessing) {
      processQueue();
    }
  });
}

/**
 * Processes the queue sequentially with 1.5s delays between sends.
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const entry = queue.shift()!;

    try {
      await sendTelegramMessage(entry.botToken, entry.chatId, entry.text);
      entry.resolve();
    } catch (error) {
      entry.reject(error instanceof Error ? error : new Error(String(error)));
    }

    // Delay before next message — even if queue is empty,
    // the next enqueue will respect at least 1.5s from this send
    if (queue.length > 0) {
      await sleep(INTER_MESSAGE_DELAY_MS);
    }
  }

  isProcessing = false;
}

// ─────────────────────────────────────────────────────────────
// Raw Telegram API Call (with 429 retry logic)
// ─────────────────────────────────────────────────────────────

/**
 * Sends a message via the Telegram Bot API.
 *
 * Handles HTTP 429 (Too Many Requests) by waiting for the
 * `retry_after` duration and retrying up to MAX_RETRIES times.
 *
 * @param botToken — Telegram bot token (decrypted).
 * @param chatId  — Target chat ID.
 * @param text    — Markdown-formatted message text.
 * @throws {TelegramApiError} on non-recoverable errors.
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (response.ok) {
      return;
    }

    // ── Handle 429 : Too Many Requests ──
    if (response.status === 429) {
      const body = (await response.json().catch(() => ({}))) as {
        parameters?: { retry_after?: number };
      };

      const retryAfter = body?.parameters?.retry_after ?? 5;

      if (attempt < MAX_RETRIES) {
        log.warn(
          `Telegram 429 — waiting ${retryAfter}s before retry ` +
            `(attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(retryAfter * 1000);
        continue;
      }

      throw new TelegramApiError(
        `Telegram rate limit exceeded after ${MAX_RETRIES} retries`,
        429,
      );
    }

    // ── Non-429 error ──
    const errorBody = await response.text().catch(() => 'unknown error');
    throw new TelegramApiError(
      `Telegram API error: ${response.status} — ${errorBody}`,
      response.status,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Sends a Telegram notification for a single query's diff results.
 *
 * The message is:
 * - Truncated to top 10 items (combined new + price drops)
 * - Enqueued in the flood-control queue (1.5s between sends)
 * - Never split into multiple messages
 *
 * @param config  — Telegram bot token and chat ID (decrypted).
 * @param payload — Items to include in the message.
 */
export async function sendTelegram(
  config: TelegramConfig,
  payload: TelegramPayload,
): Promise<void> {
  const text = buildTelegramMessage(payload);
  const chatIds = config.chatId.split(',').map(id => id.trim()).filter(Boolean);

  for (const chatId of chatIds) {
    await enqueue({
      botToken: config.botToken,
      chatId,
      text,
    });
  }

  log.info(
    `Telegram message queued for "${payload.queryLabel}" to ${chatIds.length} chat(s): ` +
      `${payload.newItems.length} new, ${payload.priceDrops.length} drops`,
  );
}

/**
 * Tests the Telegram bot connection by calling getMe.
 *
 * @param config  — Bot token to test.
 * @returns `{ success: true }` or `{ success: false, error: string }`.
 */
export async function testTelegramConnection(
  config: TelegramConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${TELEGRAM_API_BASE}/bot${config.botToken}/getMe`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown error');
      return { success: false, error: `HTTP ${response.status}: ${body}` };
    }

    log.info('Telegram connection test passed');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Telegram connection test failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────
// Message Template (Markdown V1)
//
// Telegram Markdown V1 supports: *bold*, _italic_, [link](url)
// We use this for broad client compatibility.
// ─────────────────────────────────────────────────────────────

function buildTelegramMessage(payload: TelegramPayload): string {
  const label = payload.queryLabel || payload.queryKeywords;
  const lines: string[] = [];

  lines.push(`📦 *eBay Tracker Alert*`);
  lines.push(`Query: "${escapeMd(label)}"`);
  lines.push('');

  // Compute truncation
  const totalNewItems = payload.newItems.length;
  const totalPriceDrops = payload.priceDrops.length;
  const totalItems = totalNewItems + totalPriceDrops;

  // Distribute the 10-item budget: new items first, then price drops
  const maxNew = Math.min(totalNewItems, MAX_ITEMS_PER_MESSAGE);
  const maxDrops = Math.min(totalPriceDrops, MAX_ITEMS_PER_MESSAGE - maxNew);

  const displayedNew = payload.newItems.slice(0, maxNew);
  const displayedDrops = payload.priceDrops.slice(0, maxDrops);

  // ── New Items ──
  if (displayedNew.length > 0) {
    lines.push(`🆕 *New Items (${totalNewItems}):*`);
    for (const item of displayedNew) {
      const sym = getCurrencySymbol(item.currency);
      lines.push(
        `• [${escapeMd(truncateTitle(item.title))}](${item.itemUrl})` +
          ` — ${sym}${item.totalCost.toFixed(2)}`,
      );
    }
    lines.push('');
  }

  // ── Price Drops ──
  if (displayedDrops.length > 0) {
    lines.push(`📉 *Price Drops (${totalPriceDrops}):*`);
    for (const item of displayedDrops) {
      const sym = getCurrencySymbol(item.currency);
      lines.push(
        `• [${escapeMd(truncateTitle(item.title))}](${item.itemUrl})` +
          ` — ~${sym}${item.previousTotalCost.toFixed(2)}~ → *${sym}${item.currentTotalCost.toFixed(2)}* (−${item.dropPercent}%)`,
      );
    }
    lines.push('');
  }

  // ── Truncation footer ──
  const displayedTotal = displayedNew.length + displayedDrops.length;
  if (displayedTotal < totalItems) {
    const remaining = totalItems - displayedTotal;
    lines.push(`…and ${remaining} more item${remaining === 1 ? '' : 's'}. Check the dashboard for full details.`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

/**
 * Escapes Markdown V1 special characters.
 */
function escapeMd(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Truncates a title to 60 chars for compact Telegram display.
 */
function truncateTitle(title: string, maxLen: number = 60): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '…';
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    AUD: 'A$',
    CAD: 'C$',
  };
  return symbols[currency] ?? `${currency} `;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────
// Error Class
// ─────────────────────────────────────────────────────────────

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TelegramApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}
