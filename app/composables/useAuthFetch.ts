// ─────────────────────────────────────────────────────────────
// Authenticated $fetch helper
//
// Wraps Nuxt's $fetch to automatically attach the
// Authorization: Bearer <ADMIN_TOKEN> header required by
// server/middleware/auth.ts.
//
// Usage:  const data = await authFetch('/api/queries');
// ─────────────────────────────────────────────────────────────

/**
 * Returns the Authorization header object for API calls.
 * Reads the ADMIN_TOKEN from Nuxt public runtime config.
 */
export function useAuthHeaders(): Record<string, string> {
  const config = useRuntimeConfig();
  const token = config.public.adminToken as string;

  if (!token) {
    console.warn('[auth] NUXT_PUBLIC_ADMIN_TOKEN is not set — API calls will be rejected.');
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

/**
 * Authenticated wrapper around $fetch.
 * Merges the Bearer token header into every request.
 *
 * Accepts the same options as Nuxt's $fetch but injects
 * the Authorization header automatically.
 */
export async function authFetch<T = any>(
  url: string,
  opts: Record<string, any> = {},
): Promise<T> {
  const headers = useAuthHeaders();

  return ($fetch as any)(url, {
    ...opts,
    headers: {
      ...headers,
      ...(opts.headers ?? {}),
    },
  }) as Promise<T>;
}
