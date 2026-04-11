// ─────────────────────────────────────────────────────────────
// Structured Logger
// Uses consola (bundled with Nuxt/Nitro) for tagged child loggers.
// See ARCHITECTURE.md — replaces raw console.log per skill guidelines.
// ─────────────────────────────────────────────────────────────

import { createConsola, type ConsolaInstance } from 'consola';

/**
 * Creates a tagged child logger for a specific module.
 *
 * @example
 * ```ts
 * const log = createLogger('scheduler');
 * log.info('Poll started', { queryId });
 * log.error('Poll failed', { error });
 * ```
 */
export function createLogger(tag: string): ConsolaInstance {
  return createConsola({
    defaults: {
      tag,
    },
  });
}
