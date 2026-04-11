// ─────────────────────────────────────────────────────────────
// Global API Authentication Middleware
//
// Requires a Bearer token matching the ADMIN_TOKEN env var
// on all /api/ routes. This mitigates OWASP A01:2021
// (Broken Access Control) and CSRF (since malicious sites
// cannot attach the Authorization header cross-origin).
//
// FAIL-SECURE: If ADMIN_TOKEN is not configured, all API
// requests are blocked with a 500 error.
// ─────────────────────────────────────────────────────────────

export default defineEventHandler((event) => {
  // Only protect /api/ routes — let Nuxt SSR / static assets through
  if (!event.path.startsWith('/api/')) return;

  // Allow a public healthcheck endpoint without auth
  if (event.path === '/api/health') return;

  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    // Fail-secure: if no token is configured, block all API access
    throw createError({
      statusCode: 500,
      statusMessage: 'Server misconfiguration: ADMIN_TOKEN not set',
    });
  }

  const authHeader = getHeader(event, 'authorization');

  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }
});
