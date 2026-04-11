// ─────────────────────────────────────────────────────────────
// Email Sender — Nodemailer wrapper with batched HTML templates
//
// Sends a single consolidated email per query per poll cycle.
// All new items and price drops are rendered into one HTML
// message using a clean, responsive template.
//
// See ARCHITECTURE.md §5.6 — email dispatch is async, no queue
// (unlike Telegram which needs flood-control serialization).
// ─────────────────────────────────────────────────────────────

import { createTransport, type Transporter } from 'nodemailer';
import { createLogger } from '../../utils/logger';
import type { NewItemRecord, PriceDropRecord } from '../diff-engine/index';

const log = createLogger('email-sender');

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
  from: string;
  to: string;
}

export interface EmailPayload {
  queryLabel: string;
  queryKeywords: string;
  newItems: NewItemRecord[];
  priceDrops: PriceDropRecord[];
}

// ─────────────────────────────────────────────────────────────
// Transporter singleton (reuses TCP connection pool)
// ─────────────────────────────────────────────────────────────

let _transporter: Transporter | null = null;
let _lastConfigHash: string = '';

/**
 * Creates or returns a cached Nodemailer transporter.
 *
 * If the SMTP config changes (detected by a simple hash),
 * the old transporter is closed and a new one is created.
 */
function getTransporter(config: SmtpConfig): Transporter {
  const configHash = `${config.host}:${config.port}:${config.username}:${config.useTls}`;

  if (_transporter && _lastConfigHash === configHash) {
    return _transporter;
  }

  // Close previous transporter if config changed
  if (_transporter) {
    _transporter.close();
  }

  _transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for port 465, false for STARTTLS
    auth: {
      user: config.username,
      pass: config.password,
    },
    tls: config.useTls
      ? { rejectUnauthorized: true }
      : undefined,
  });

  _lastConfigHash = configHash;
  log.info(`SMTP transporter created: ${config.host}:${config.port}`);

  return _transporter;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Sends a batched notification email for a single query.
 *
 * One email per query per poll cycle — all new items and
 * price drops are consolidated into a single HTML message.
 *
 * @param config — SMTP connection settings (decrypted).
 * @param payload — Items to include in the email.
 * @throws {Error} if SMTP send fails.
 */
export async function sendEmail(
  config: SmtpConfig,
  payload: EmailPayload,
): Promise<void> {
  const transporter = getTransporter(config);

  const subject = buildSubject(payload);
  const html = buildHtmlTemplate(payload);

  try {
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      html,
    });

    log.info(
      `Email sent for "${payload.queryLabel}": ` +
        `${payload.newItems.length} new, ${payload.priceDrops.length} drops`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Email send failed: ${msg}`);
    throw error;
  }
}

/**
 * Tests the SMTP connection by verifying transporter readiness.
 *
 * @param config — SMTP settings to test.
 * @returns `{ success: true }` or `{ success: false, error: string }`.
 */
export async function testSmtpConnection(
  config: SmtpConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter(config);
    await transporter.verify();
    log.info('SMTP connection test passed');
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`SMTP connection test failed: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Resets the transporter — call when user updates SMTP settings.
 */
export function resetTransporter(): void {
  if (_transporter) {
    _transporter.close();
    _transporter = null;
    _lastConfigHash = '';
  }
}

// ─────────────────────────────────────────────────────────────
// Template Helpers
// ─────────────────────────────────────────────────────────────

function buildSubject(payload: EmailPayload): string {
  const parts: string[] = [];

  if (payload.newItems.length > 0) {
    parts.push(`${payload.newItems.length} new item${payload.newItems.length === 1 ? '' : 's'}`);
  }

  if (payload.priceDrops.length > 0) {
    parts.push(`${payload.priceDrops.length} price drop${payload.priceDrops.length === 1 ? '' : 's'}`);
  }

  const label = payload.queryLabel || payload.queryKeywords;
  return `eBay Tracker: ${parts.join(', ')} — "${label}"`;
}

/**
 * Builds a responsive HTML email template.
 *
 * Uses inline styles for maximum email client compatibility
 * (Outlook, Gmail, Apple Mail, etc.).
 */
function buildHtmlTemplate(payload: EmailPayload): string {
  const label = escapeHtml(payload.queryLabel || payload.queryKeywords);

  let itemsHtml = '';

  // ── New Items Section ──
  if (payload.newItems.length > 0) {
    itemsHtml += `
      <tr>
        <td style="padding: 16px 24px 8px;">
          <h2 style="margin: 0; font-size: 18px; color: #16a34a; font-weight: 600;">
            🆕 New Items (${payload.newItems.length})
          </h2>
        </td>
      </tr>`;

    for (const item of payload.newItems) {
      itemsHtml += renderNewItemRow(item);
    }
  }

  // ── Price Drops Section ──
  if (payload.priceDrops.length > 0) {
    itemsHtml += `
      <tr>
        <td style="padding: 16px 24px 8px;">
          <h2 style="margin: 0; font-size: 18px; color: #dc2626; font-weight: 600;">
            📉 Price Drops (${payload.priceDrops.length})
          </h2>
        </td>
      </tr>`;

    for (const item of payload.priceDrops) {
      itemsHtml += renderPriceDropRow(item);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eBay Tracker Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 24px auto;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
          📦 eBay Tracker Alert
        </h1>
        <p style="margin: 8px 0 0; color: #dbeafe; font-size: 14px;">
          Updates for "${label}"
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${itemsHtml}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent by eBay Tracker &bull; Check your dashboard for full details
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderNewItemRow(item: NewItemRecord): string {
  const title = escapeHtml(item.title);
  const currencySymbol = getCurrencySymbol(item.currency);

  return `
    <tr>
      <td style="padding: 12px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <tr>
            <td style="padding: 12px 16px;">
              <a href="${escapeHtml(item.itemUrl)}" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px; display: block; margin-bottom: 4px;">
                ${title}
              </a>
              <span style="font-size: 16px; font-weight: 700; color: #15803d;">
                ${currencySymbol}${item.totalCost.toFixed(2)}
              </span>
              <span style="font-size: 12px; color: #6b7280; margin-left: 8px;">
                (${currencySymbol}${item.price.toFixed(2)} + ${currencySymbol}${item.shippingCost.toFixed(2)} ship)
              </span>
              <span style="font-size: 11px; color: #9ca3af; margin-left: 8px;">
                ${item.buyingOption.replace(/_/g, ' ')}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderPriceDropRow(item: PriceDropRecord): string {
  const title = escapeHtml(item.title);
  const currencySymbol = getCurrencySymbol(item.currency);

  return `
    <tr>
      <td style="padding: 12px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <tr>
            <td style="padding: 12px 16px;">
              <a href="${escapeHtml(item.itemUrl)}" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px; display: block; margin-bottom: 4px;">
                ${title}
              </a>
              <span style="font-size: 14px; color: #9ca3af; text-decoration: line-through;">
                ${currencySymbol}${item.previousTotalCost.toFixed(2)}
              </span>
              <span style="font-size: 16px; font-weight: 700; color: #dc2626; margin-left: 8px;">
                ${currencySymbol}${item.currentTotalCost.toFixed(2)}
              </span>
              <span style="font-size: 12px; color: #dc2626; margin-left: 8px;">
                ▼ ${item.dropPercent}% since first seen
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
