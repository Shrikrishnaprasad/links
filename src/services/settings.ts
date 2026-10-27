export interface Settings {
  /** Check links in the background once a day (needs the optional site permission). */
  autoCheck: boolean;
}
const KEY = 'linkvault:settings';
const DEFAULTS: Settings = { autoCheck: false };
const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export async function getSettings(): Promise<Settings> {
  if (hasChrome) {
    const r = await chrome.storage.local.get(KEY);
    return { ...DEFAULTS, ...(r[KEY] as Partial<Settings> | undefined) };
  }
  const raw = localStorage.getItem(KEY);
  return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  if (hasChrome) await chrome.storage.local.set({ [KEY]: next });
  else localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
