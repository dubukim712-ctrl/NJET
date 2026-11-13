const VERIFICATION_EMAIL_KEY = 'njet:signup-email';

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
