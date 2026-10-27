import { linkVisibility, type AccessRole, type Collection, type LinkItem } from '../types/links';

/** Payload embedded inside a share token. */
export interface SharePayload {
  v: 1;
  name: string;
  role: AccessRole;
  links: Array<Pick<LinkItem, 'url' | 'title' | 'tags' | 'description'> & { section?: string }>;
}

function toB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShare(collection: Collection, links: LinkItem[], role: AccessRole): string {
  const payload: SharePayload = {
    v: 1,
    name: collection.name,
    role,
    // Private links never leave the device.
    links: links
      .filter((l) => linkVisibility(l) === 'public')
      .map((l) => ({
        url: l.url,
        title: l.title,
        tags: l.tags,
        description: l.description,
        section: collection.sections?.find((s) => s.id === l.sectionId)?.name,
      })),
  };
  return 'lv1.' + toB64(JSON.stringify(payload));
}

export function decodeShare(input: string): SharePayload | null {
  try {
    const token = input.trim().split(/[#?&=\s/]/).find((p) => p.startsWith('lv1.'));
    if (!token) return null;
    const payload = JSON.parse(fromB64(token.slice(4))) as SharePayload;
    if (payload.v !== 1 || !Array.isArray(payload.links)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Builds a pasteable share link (the token lives in the hash so it never hits a server). */
export function buildShareLink(token: string): string {
  const base =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('dashboard.html')
      : `${location.origin}/dashboard.html`;
  return `${base}#share=${token}`;
}

export function linksToText(links: LinkItem[], format: 'plain' | 'markdown' = 'plain'): string {
  return links
    .map((l) => (format === 'markdown' ? `- [${l.title || l.url}](${l.url})` : l.url))
    .join('\n');
}
