const SANDBOX_PREFIX = "dev_sandbox_";
export const SANDBOX_MODE_KEY = "dev_sandbox_active";
export const APP_DATA_RESET_EVENT = "knd:data-reset";

export function isSandboxActive() {
  return import.meta.env.DEV && window.localStorage.getItem(SANDBOX_MODE_KEY) === "true";
}

export function scopedStorageKey(key) {
  return isSandboxActive() ? `${SANDBOX_PREFIX}${key}` : key;
}

export const appStorage = {
  getItem(key) {
    return window.localStorage.getItem(scopedStorageKey(key));
  },
  setItem(key, value) {
    window.localStorage.setItem(scopedStorageKey(key), value);
  },
  removeItem(key) {
    window.localStorage.removeItem(scopedStorageKey(key));
  },
};

export function enterSandboxMode() {
  if (!import.meta.env.DEV) {
    throw new Error("The development sandbox is not available in production.");
  }
  window.localStorage.setItem(SANDBOX_MODE_KEY, "true");
  window.dispatchEvent(new Event(APP_DATA_RESET_EVENT));
}

export function exitSandboxMode() {
  window.localStorage.removeItem(SANDBOX_MODE_KEY);
  window.dispatchEvent(new Event(APP_DATA_RESET_EVENT));
}

export function clearSandboxStorage() {
  if (!import.meta.env.DEV) {
    throw new Error("The development sandbox is not available in production.");
  }
  const keysToRemove = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(SANDBOX_PREFIX) && key !== SANDBOX_MODE_KEY) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
