// ─────────────────────────────────────────────────────────────
// Server-Side Constants
//
// Shared values used across multiple API route handlers and
// modules. Keep only values that would otherwise be duplicated
// in two or more files.
// ─────────────────────────────────────────────────────────────

/** All valid polling interval values (mirrors the DB enum). */
export const VALID_INTERVALS = ['5m', '15m', '30m', '1h', '6h'] as const;

export type PollingInterval = typeof VALID_INTERVALS[number];