/**
 * Page metadata + link health, using an OPTIONAL host permission so the extension
 * only gets network access to other sites after the user opts in.
 */
const ALL = { origins: ['<all_urls>'] };

export const canFetchPages = () => typeof chrome !== 'undefined' && !!chrome.permissions;

export async function hasPagePermission(): Promise<boolean> {
  if (!canFetchPages()) return false;
  return chrome.permissions.contains(ALL);
}

/** Must be called from a user gesture (button click). */
export async function requestPagePermission(): Promise<boolean> {
  if (!canFetchPages()) return false;
  return chrome.permissions.request(ALL);
}

async function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, redirect: 'follow', credentials: 'omit' });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchMeta(url: string): Promise<{ title?: string; description?: string } | null> {
  try {
    const res = await timedFetch(url, { headers: { Accept: 'text/html' } }, 8000);
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null;
    // Only read the head of the document.
    const text = (await res.text()).slice(0, 200_000);
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const og = (p: string) => doc.querySelector(`meta[property="${p}"]`)?.getAttribute('content')?.trim();
    const title = og('og:title') || doc.title?.trim();
    const description =
      og('og:description') || doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    return { title: title || undefined, description: description || undefined };
  } catch {
    return null;
  }
}

/** 'broken' only for clear failures (4xx/5xx/DNS); other issues are treated as ok to avoid false alarms. */
export async function checkLink(url: string): Promise<'ok' | 'broken'> {
  if (!/^https?:/i.test(url)) return 'ok';
  try {
    let res = await timedFetch(url, { method: 'HEAD' }, 8000);
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await timedFetch(url, { method: 'GET' }, 8000);
    }
    return res.status === 404 || res.status === 410 || res.status >= 500 ? 'broken' : 'ok';
  } catch (e) {
    // Network error (DNS failure, refused). Abort = timeout: treat as broken too.
    return 'broken';
  }
}

/** Run `fn` over items with limited concurrency. */
export async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}
