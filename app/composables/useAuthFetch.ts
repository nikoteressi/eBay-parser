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
 */
export async function authFetch<T = unknown>(
  url: string,
  opts: Parameters<typeof $fetch>[1] = {},
): Promise<T> {
  return $fetch(url, {
    ...opts,
    headers: {
      ...useAuthHeaders(),
      ...(opts?.headers as Record<string, string> ?? {}),
    },
  }) as Promise<T>;
}
