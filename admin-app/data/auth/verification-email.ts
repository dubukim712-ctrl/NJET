const VERIFICATION_EMAIL_KEY = 'njet:signup-email';

function cooldownKey(email: string) {
  return VERIFICATION_EMAIL_KEY + ':cooldown:' + email.trim().toLowerCase();
}

export function getVerificationCooldown(email: string) {
  if (!email) return 0;
  try {
    const expiresAt = Number(window.sessionStorage.getItem(cooldownKey(email)));
    return Number.isFinite(expiresAt) ? expiresAt : 0;
  } catch {
    return 0;
  }
}

export function startVerificationCooldown(email: string) {
  const expiresAt = Date.now() + 60_000;
  try {
    window.sessionStorage.setItem(cooldownKey(email), String(expiresAt));
  } catch {
    // The current screen still uses the returned cooldown.
  }
  return expiresAt;
}

export function isVerificationRateLimited(error: { code?: string; status?: number }) {
  return error.status === 429
    || error.code === 'over_email_send_rate_limit'
    || error.code === 'over_request_rate_limit';
}

export function rememberVerificationEmail(email: string) {
  try {
    window.sessionStorage.setItem(VERIFICATION_EMAIL_KEY, email);
  } catch {
    // The verification form still allows manual email entry.
  }
}

export function getRememberedVerificationEmail() {
  try {
    return window.sessionStorage.getItem(VERIFICATION_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearRememberedVerificationEmail() {
  try {
    window.sessionStorage.removeItem(VERIFICATION_EMAIL_KEY);
  } catch {
    // The email is short-lived convenience state, not an auth credential.
  }
}
