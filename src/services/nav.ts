import type { MouseEvent } from 'react';

const INTERNAL = /^(chrome|edge|brave|about|chrome-extension|view-source):/i;

/**
 * Extension pages are not allowed to navigate to browser-internal URLs
 * (e.g. chrome://extensions) via a normal <a href>. Open those with the tabs API.
 */
export function openLink(e: MouseEvent, url: string) {
  if (!INTERNAL.test(url)) return; // normal links: let the browser handle it
  e.preventDefault();
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) chrome.tabs.create({ url });
}
