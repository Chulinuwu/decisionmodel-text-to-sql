import type { ThreadStorage } from '../types/state';

// Accessing localStorage itself throws in some privacy modes and outside the browser (tests).
export function browserStorage(): ThreadStorage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

export function readStored(key: string, storage = browserStorage()) {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

export function writeStored(key: string, value: string, storage = browserStorage()) {
  try { storage?.setItem(key, value); } catch { /* storage is a convenience; the app keeps working without it */ }
}
