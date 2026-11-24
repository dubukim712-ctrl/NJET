export const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

/** @param {string} value */
export function escapeEmailHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
}

/**
 * @typedef {{
 *   sender: { email: string, name: string },
 *   to: { email: string }[],
 *   subject: string,
 *   textContent: string,
 *   htmlContent: string
 * }} BrevoPayload
 */

/**
 * @param {{
 *   label: string,
 *   apiKey?: string,
 *   senderEmail?: string,
 *   prepare: (sender: string) => Promise<BrevoPayload | null>,
 *   send?: typeof fetch
 * }} options
 */
export async function deliverBrevoEmail({
  label, apiKey, senderEmail, prepare, send = fetch,
}) {
  if (!apiKey || !senderEmail) {
    console.warn(label + ' skipped because Brevo configuration is missing.');
    return;
  }

  try {
    const payload = await prepare(senderEmail);
    if (!payload) return;

    const response = await send(BREVO_EMAIL_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) console.warn(label + ' rejected by Brevo.', response.status);
  } catch {
    console.warn(label + ' could not be sent.');
  }
}
