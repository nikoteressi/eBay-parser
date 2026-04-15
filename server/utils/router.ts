import type { H3Event } from 'h3';

/**
 * Reads a required router param or throws a 400.
 */
export function requireRouterParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name);
  if (!value) {
    throw createError({ statusCode: 400, statusMessage: `Missing ${name}` });
  }
  return value;
}
