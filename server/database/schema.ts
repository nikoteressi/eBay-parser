import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// tracked_queries — Each row is one user-saved eBay search
// ─────────────────────────────────────────────────────────────

export const trackedQueries = sqliteTable('tracked_queries', {
  id: text('id').primaryKey(),                         // ULID
  label: text('label'),                                // User-defined friendly name (nullable)
  rawUrl: text('raw_url').notNull(),                   // Original pasted eBay URL
  parsedParams: text('parsed_params').notNull(),       // JSON: { q, filter, sort, limit }
  pollingInterval: text('polling_interval', {
    enum: ['5m', '15m', '30m', '1h', '6h'],
  }).notNull(),
  trackPrices: integer('track_prices', { mode: 'boolean' }).notNull().default(true),
  notifyChannel: text('notify_channel', {
    enum: ['email', 'telegram', 'both'],
  }).notNull().default('both'),
  isPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  status: text('status', {
    enum: ['active', 'paused', 'error'],
  }).notNull().default('active'),
  lastError: text('last_error'),                       // Latest error message (nullable)
  lastPolledAt: text('last_polled_at'),                // ISO 8601 (nullable)
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_queries_status').on(table.status),
  index('idx_queries_next_poll').on(table.isPaused, table.lastPolledAt),
]);

// ─────────────────────────────────────────────────────────────
// tracked_items — Every item ever seen by the poller (per query)
// Replaces the SNAPSHOT concept entirely.
// ─────────────────────────────────────────────────────────────

export const trackedItems = sqliteTable('tracked_items', {
  id: text('id').primaryKey(),                         // ULID
  queryId: text('query_id').notNull()
    .references(() => trackedQueries.id, { onDelete: 'cascade' }),
  ebayItemId: text('ebay_item_id').notNull(),
  title: text('title').notNull(),
  itemUrl: text('item_url').notNull(),
  imageUrl: text('image_url'),                         // Thumbnail (nullable)
  buyingOption: text('buying_option', {
    enum: ['FIXED_PRICE', 'AUCTION', 'AUCTION_BIN'],
  }).notNull(),
  firstSeenPrice: real('first_seen_price').notNull(),
  currentPrice: real('current_price').notNull(),
  firstSeenShipping: real('first_seen_shipping').notNull().default(0.0),
  currentShipping: real('current_shipping').notNull().default(0.0),
  firstSeenTotalCost: real('first_seen_total_cost').notNull(),
  currentTotalCost: real('current_total_cost').notNull(),
  currency: text('currency').notNull().default('USD'),
  itemStatus: text('item_status', {
    enum: ['active', 'out_of_view', 'ended_or_sold'],
  }).notNull().default('active'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  outOfViewSince: text('out_of_view_since'),           // Grace period start (nullable)
  endedAt: text('ended_at'),                           // Hard status change (nullable)
  acceptsOffers: integer('accepts_offers', { mode: 'boolean' }).notNull().default(false),
  notifiedNew: integer('notified_new', { mode: 'boolean' }).notNull().default(false),
  lastNotifiedPrice: real('last_notified_price'),      // Total cost at last price-drop alert
}, (table) => [
  index('idx_items_query_status').on(table.queryId, table.itemStatus),
  uniqueIndex('idx_items_query_ebay').on(table.queryId, table.ebayItemId),
  index('idx_items_out_of_view').on(table.itemStatus, table.outOfViewSince),
  index('idx_items_ended').on(table.itemStatus, table.endedAt),
]);

// ─────────────────────────────────────────────────────────────
// notification_log — Audit trail for sent notifications
// ─────────────────────────────────────────────────────────────

export const notificationLog = sqliteTable('notification_log', {
  id: text('id').primaryKey(),                         // ULID
  queryId: text('query_id').notNull()
    .references(() => trackedQueries.id, { onDelete: 'cascade' }),
  channel: text('channel', {
    enum: ['email', 'telegram'],
  }).notNull(),
  newItemsCount: integer('new_items_count').notNull().default(0),
  priceDropsCount: integer('price_drops_count').notNull().default(0),
  status: text('status', {
    enum: ['sent', 'failed'],
  }).notNull(),
  errorMessage: text('error_message'),                 // Nullable
  sentAt: text('sent_at').notNull(),
}, (table) => [
  index('idx_notif_query').on(table.queryId, table.sentAt),
]);

// ─────────────────────────────────────────────────────────────
// settings — Key-value store for all configuration
// Secrets are encrypted at rest (AES-256-GCM)
// ─────────────────────────────────────────────────────────────

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),                       // Dotted key: smtp.host, ebay.client_id
  value: text('value').notNull(),                      // Encrypted for secrets, plain otherwise
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────
// api_usage_log — Daily counter for eBay API calls
// One row per calendar day (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────

export const apiUsageLog = sqliteTable('api_usage_log', {
  date: text('date').primaryKey(),                     // YYYY-MM-DD
  callsMade: integer('calls_made').notNull().default(0),
  dailyLimit: integer('daily_limit').notNull().default(5000),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
