export type AdminThemePreference = "system" | "light" | "dark";
type AdminThemeSnapshot = "system-light" | "system-dark" | "light" | "dark";

const STORAGE_KEY = "njet-admin-theme";
const listeners = new Set<() => void>();
let memoryPreference: AdminThemePreference | null = null;

function readPreference(): AdminThemePreference {
  if (memoryPreference) return memoryPreference;
  if (typeof window === "undefined") return "system";
  try {
    const preference = window.localStorage.getItem(STORAGE_KEY);
    return preference === "light" || preference === "dark"
      ? preference
      : "system";
  } catch (error) {
    console.error("Could not read the saved admin theme preference.", error);
    return "system";
  }
}

export function getAdminThemeSnapshot(): AdminThemeSnapshot {
  const preference = readPreference();
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "system-dark"
    : "system-light";
}

export function getServerAdminThemeSnapshot(): AdminThemeSnapshot {
  return "system-light";
}

export function subscribeToAdminTheme(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    memoryPreference = null;
    notifyListeners();
  };
  mediaQuery.addEventListener("change", notifyListeners);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    mediaQuery.removeEventListener("change", notifyListeners);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function saveAdminThemePreference(preference: AdminThemePreference) {
  memoryPreference = preference;
  try {
    if (preference === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch (error) {
    console.error("Could not save the admin theme preference.", error);
  }
  notifyListeners();
}
