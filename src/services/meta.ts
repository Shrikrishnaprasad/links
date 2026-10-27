import { canonicalUrl } from './storage';

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

export async function fetchMeta(url: string): Promise<{ title?: string; description?: string; image?: string } | null> {
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
    let image = og('og:image');
    if (image) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = undefined;
      }
    }
    return { title: title || undefined, description: description || undefined, image };
  } catch {
    return null;
  }
}

export interface LinkCheck {
  status: 'ok' | 'broken';
  code?: number;
  finalUrl?: string;
}

/**
 * 'broken' only for clear failures (404/410/5xx, DNS errors, timeouts).
 * 401/403/429 mean the page exists but is protected or rate limited, so they count as ok.
 */
export async function checkLink(url: string): Promise<LinkCheck> {
  if (!/^https?:/i.test(url)) return { status: 'ok' };
  try {
    let res = await timedFetch(url, { method: 'HEAD' }, 8000);
    if ([403, 405, 501].includes(res.status)) res = await timedFetch(url, { method: 'GET' }, 8000);
    const finalUrl = res.redirected && canonicalUrl(res.url) !== canonicalUrl(url) ? res.url : undefined;
    const broken = res.status === 404 || res.status === 410 || res.status >= 500;
    return { status: broken ? 'broken' : 'ok', code: res.status, finalUrl };
  } catch {
    return { status: 'broken' };
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
