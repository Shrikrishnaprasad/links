import {
  DEFAULT_COLLECTION_ID,
  type AppData,
  type Collection,
  type LinkItem,
  type ShareSettings,
  type SyncState,
  type Section,
  type Visibility,
} from '../types/links';

const KEY = 'linkvault:data';
const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const defaultShare = (): ShareSettings => ({
  generalAccess: 'restricted',
  generalRole: 'viewer',
  collaborators: [],
  updatedAt: Date.now(),
});

function seed(): AppData {
  const now = Date.now();
  return {
    links: [],
    collections: [
      {
        id: DEFAULT_COLLECTION_ID,
        name: 'Links',
        color: '#1a73e8',
        parentId: null,
        visibility: 'private',
        sections: [],
        shareSettings: defaultShare(),
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

type Listener = (d: AppData) => void;
const listeners = new Set<Listener>();
const syncListeners = new Set<(s: SyncState) => void>();
let syncState: SyncState = { status: hasChrome ? 'idle' : 'local-only' };

function setSync(s: SyncState) {
  syncState = s;
  syncListeners.forEach((l) => l(s));
}
export const getSyncState = () => syncState;
export function onSyncState(l: (s: SyncState) => void) {
  syncListeners.add(l);
  return () => syncListeners.delete(l);
}

const META_KEY = KEY + ':meta';
const CHUNK_KEY = (i: number) => `${KEY}:c${i}`;
const CHUNK_CHARS = 2500; // <= 7.5KB even with 3-byte characters (item limit is 8KB)
const SYNC_MAX_BYTES = 90_000; // quota is ~100KB total
let lastPushedStamp = 0;

async function readSyncChunks(): Promise<AppData | null> {
  if (!hasChrome || !chrome.storage.sync) return null;
  const meta = (await chrome.storage.sync.get(META_KEY))[META_KEY] as { n: number; ts: number } | undefined;
  if (!meta) {
    // Legacy single-item format
    const legacy = (await chrome.storage.sync.get(KEY))[KEY] as AppData | undefined;
    return legacy ?? null;
  }
  const keys = Array.from({ length: meta.n }, (_, i) => CHUNK_KEY(i));
  const got = await chrome.storage.sync.get(keys);
  const json = keys.map((k) => got[k] ?? '').join('');
  try {
    return JSON.parse(json) as AppData;
  } catch {
    return null;
  }
}

async function rawRead(area: 'local' | 'sync'): Promise<AppData | null> {
  if (area === 'sync') return readSyncChunks();
  if (hasChrome) {
    const r = await chrome.storage.local.get(KEY);
    return (r[KEY] as AppData) ?? null;
  }
  const s = localStorage.getItem(KEY);
  return s ? (JSON.parse(s) as AppData) : null;
}

export async function loadData(): Promise<AppData> {
  const local = await rawRead('local');
  if (local) {
    // Migrate the old default name "Inbox" to "Links".
    const def = local.collections.find((c) => c.id === DEFAULT_COLLECTION_ID);
    if (def && def.name === 'Inbox') {
      const migrated = {
        ...local,
        collections: local.collections.map((c) => (c.id === DEFAULT_COLLECTION_ID ? { ...c, name: 'Links' } : c)),
      };
      await saveData(migrated);
      return migrated;
    }
    return local;
  }
  // First run on this device: try to restore from sync.
  const synced = await rawRead('sync').catch(() => null);
  const data = synced ?? seed();
  await saveData(data);
  return data;
}

/** chrome.storage.sync allows 8KB/item and ~100KB total, so we split the JSON into chunks. */
async function pushSync(data: AppData) {
  if (!hasChrome || !chrome.storage.sync) return;
  try {
    setSync({ status: 'syncing' });
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json).length;
    if (bytes > SYNC_MAX_BYTES) {
      setSync({
        status: 'error',
        message: 'Library is too large for browser sync (~90KB). Data is safe on this device; use Export to back up.',
      });
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK_CHARS) chunks.push(json.slice(i, i + CHUNK_CHARS));
    const old = (await chrome.storage.sync.get(META_KEY))[META_KEY] as { n: number } | undefined;
    const ts = Date.now();
    const items: Record<string, unknown> = { [META_KEY]: { n: chunks.length, ts } };
    chunks.forEach((c, i) => (items[CHUNK_KEY(i)] = c));
    lastPushedStamp = ts;
    await chrome.storage.sync.set(items);
    if (old && old.n > chunks.length) {
      await chrome.storage.sync.remove(Array.from({ length: old.n - chunks.length }, (_, i) => CHUNK_KEY(chunks.length + i)));
    }
    setSync({ status: 'synced', lastSyncedAt: Date.now() });
  } catch (e) {
    setSync({ status: 'error', message: (e as Error).message });
  }
}

// Pull changes made on another device.
if (hasChrome && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync' || !changes[META_KEY]?.newValue) return;
    const ts = (changes[META_KEY].newValue as { ts: number }).ts;
    if (ts === lastPushedStamp) return; // our own write
    const remote = await readSyncChunks();
    if (!remote) return;
    await chrome.storage.local.set({ [KEY]: remote });
    listeners.forEach((l) => l(remote));
    setSync({ status: 'synced', lastSyncedAt: Date.now() });
  });
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

export async function saveData(data: AppData): Promise<void> {
  if (hasChrome) await chrome.storage.local.set({ [KEY]: data });
  else {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('linkvault:change'));
  }
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushSync(data), 800);
  listeners.forEach((l) => l(data));
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  const onChrome = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[KEY]?.newValue) l(changes[KEY].newValue as AppData);
  };
  const onWin = () => loadData().then(l);
  if (hasChrome) chrome.storage.onChanged.addListener(onChrome);
  else window.addEventListener('linkvault:change', onWin);
  return () => {
    listeners.delete(l);
    if (hasChrome) chrome.storage.onChanged.removeListener(onChrome);
    else window.removeEventListener('linkvault:change', onWin);
  };
}

/* ---------- CRUD ---------- */

export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : 'https://' + t).toString();
  } catch {
    return null;
  }
}

export const faviconFor = (url: string) => {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return undefined;
  }
};

export async function addLink(
  input: {
    url: string; title?: string; collectionId?: string; sectionId?: string | null;
    visibility?: Visibility; tags?: string[]; description?: string;
  },
): Promise<LinkItem | null> {
  const url = normalizeUrl(input.url);
  if (!url) return null;
  const data = await loadData();
  const now = Date.now();
  const collectionId = input.collectionId ?? DEFAULT_COLLECTION_ID;
  const existing = data.links.find((l) => canonicalUrl(l.url) === canonicalUrl(url) && l.collectionId === collectionId && !l.deletedAt);
  if (existing) return existing;
  const link: LinkItem = {
    id: uid(),
    url,
    title: input.title?.trim() || new URL(url).hostname.replace(/^www\./, ''),
    description: input.description,
    favicon: faviconFor(url),
    collectionId,
    sectionId: input.sectionId ?? null,
    visibility: input.visibility ?? 'public',
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await saveData({ ...data, links: [link, ...data.links] });
  return link;
}

export async function updateLink(id: string, patch: Partial<LinkItem>) {
  const data = await loadData();
  await saveData({
    ...data,
    links: data.links.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l)),
  });
}

export async function trashLinks(ids: string[], restore = false) {
  const data = await loadData();
  const set = new Set(ids);
  await saveData({
    ...data,
    links: data.links.map((l) => (set.has(l.id) ? { ...l, deletedAt: restore ? null : Date.now() } : l)),
  });
}

export async function deleteLinksForever(ids: string[]) {
  const data = await loadData();
  const set = new Set(ids);
  await saveData({ ...data, links: data.links.filter((l) => !set.has(l.id)) });
}

export async function moveLinks(ids: string[], collectionId: string) {
  const data = await loadData();
  const set = new Set(ids);
  await saveData({
    ...data,
    links: data.links.map((l) => (set.has(l.id) ? { ...l, collectionId, sectionId: null, updatedAt: Date.now() } : l)),
  });
}

export async function addCollection(name: string, extra: Partial<Collection> = {}): Promise<Collection> {
  const data = await loadData();
  const now = Date.now();
  const c: Collection = {
    id: uid(),
    name: name.trim() || 'Untitled',
    color: '#1a73e8',
    parentId: null,
    visibility: 'private',
    sections: [],
    shareSettings: defaultShare(),
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
  await saveData({ ...data, collections: [...data.collections, c] });
  return c;
}

export async function updateCollection(id: string, patch: Partial<Collection>) {
  const data = await loadData();
  await saveData({
    ...data,
    collections: data.collections.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
  });
}

export async function deleteCollection(id: string) {
  if (id === DEFAULT_COLLECTION_ID) return;
  const data = await loadData();
  const now = Date.now();
  await saveData({
    collections: data.collections.filter((c) => c.id !== id),
    // Links move to Inbox rather than being lost.
    links: data.links.map((l) =>
      l.collectionId === id ? { ...l, collectionId: DEFAULT_COLLECTION_ID, updatedAt: now } : l,
    ),
  });
}

/* ---------- Sections & visibility ---------- */

export async function addSection(collectionId: string, name: string): Promise<Section> {
  const data = await loadData();
  const section: Section = { id: uid(), name: name.trim() || 'Untitled section' };
  await saveData({
    ...data,
    collections: data.collections.map((c) =>
      c.id === collectionId ? { ...c, sections: [...(c.sections ?? []), section], updatedAt: Date.now() } : c,
    ),
  });
  return section;
}

export async function updateSection(collectionId: string, sectionId: string, patch: Partial<Section>) {
  const data = await loadData();
  await saveData({
    ...data,
    collections: data.collections.map((c) =>
      c.id === collectionId
        ? { ...c, sections: (c.sections ?? []).map((s) => (s.id === sectionId ? { ...s, ...patch } : s)) }
        : c,
    ),
  });
}

/** Links in a deleted section fall back to "No section" instead of being removed. */
export async function deleteSection(collectionId: string, sectionId: string) {
  const data = await loadData();
  await saveData({
    collections: data.collections.map((c) =>
      c.id === collectionId ? { ...c, sections: (c.sections ?? []).filter((s) => s.id !== sectionId) } : c,
    ),
    links: data.links.map((l) =>
      l.collectionId === collectionId && l.sectionId === sectionId ? { ...l, sectionId: null } : l,
    ),
  });
}

export async function moveLinksToSection(ids: string[], sectionId: string | null) {
  const data = await loadData();
  const set = new Set(ids);
  await saveData({
    ...data,
    links: data.links.map((l) => (set.has(l.id) ? { ...l, sectionId, updatedAt: Date.now() } : l)),
  });
}

export async function setLinksVisibility(ids: string[], visibility: Visibility) {
  const data = await loadData();
  const set = new Set(ids);
  await saveData({
    ...data,
    links: data.links.map((l) => (set.has(l.id) ? { ...l, visibility, updatedAt: Date.now() } : l)),
  });
}

/* ---------- Duplicates, status, ordering, undo ---------- */

/** Canonical form for duplicate detection: ignores www, hash, trailing slash and tracking params. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.replace(/^www\./, '');
    [...u.searchParams.keys()]
      .filter((k) => /^(utm_|fbclid|gclid|mc_)/i.test(k))
      .forEach((k) => u.searchParams.delete(k));
    u.searchParams.sort();
    return (u.protocol + '//' + u.host + u.pathname.replace(/\/+$/, '') + u.search).toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function groupDuplicates(links: LinkItem[]): LinkItem[][] {
  const map = new Map<string, LinkItem[]>();
  for (const l of links) {
    if (l.deletedAt) continue;
    const k = canonicalUrl(l.url);
    map.set(k, [...(map.get(k) ?? []), l]);
  }
  return [...map.values()].filter((g) => g.length > 1);
}

/** Apply per-link patches in one write (used by undo). */
export async function patchLinks(patches: Array<Partial<LinkItem> & { id: string }>) {
  const data = await loadData();
  const byId = new Map(patches.map((p) => [p.id, p]));
  await saveData({
    ...data,
    links: data.links.map((l) => (byId.has(l.id) ? { ...l, ...byId.get(l.id) } : l)),
  });
}

export async function setLinkStatuses(results: Array<{ id: string; status: 'ok' | 'broken' }>) {
  const data = await loadData();
  const byId = new Map(results.map((r) => [r.id, r.status]));
  const now = Date.now();
  await saveData({
    ...data,
    links: data.links.map((l) => (byId.has(l.id) ? { ...l, linkStatus: byId.get(l.id), checkedAt: now } : l)),
  });
}

/** Persist a manual order for the given ids (in display order). */
export async function reorderLinks(orderedIds: string[]) {
  const data = await loadData();
  const pos = new Map(orderedIds.map((id, i) => [id, (i + 1) * 1000]));
  await saveData({
    ...data,
    links: data.links.map((l) => (pos.has(l.id) ? { ...l, order: pos.get(l.id) } : l)),
  });
}

/* ---------- Import / export ---------- */

export interface BackupFile {
  app: 'linkvault';
  version: 1;
  exportedAt: number;
  data: AppData;
}

export async function exportBackup(): Promise<BackupFile> {
  return { app: 'linkvault', version: 1, exportedAt: Date.now(), data: await loadData() };
}

export function toCsv(data: AppData): string {
  const name = (id: string) => data.collections.find((c) => c.id === id)?.name ?? '';
  const sec = (l: LinkItem) =>
    data.collections.find((c) => c.id === l.collectionId)?.sections?.find((x) => x.id === l.sectionId)?.name ?? '';
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = data.links
    .filter((l) => !l.deletedAt)
    .map((l) =>
      [l.url, l.title, name(l.collectionId), sec(l), l.tags.join(';'), l.visibility ?? 'public', l.description ?? '', new Date(l.createdAt).toISOString()]
        .map(q)
        .join(','),
    );
  return ['url,title,collection,section,tags,visibility,note,added', ...rows].join('\n');
}

/** Merge a LinkVault JSON backup. Existing ids are kept, new ones are added. */
export async function importBackup(file: BackupFile): Promise<{ links: number; collections: number }> {
  if (file?.app !== 'linkvault' || !file.data?.links || !file.data?.collections) throw new Error('Not a LinkVault backup file');
  const data = await loadData();
  const colIds = new Set(data.collections.map((c) => c.id));
  const linkIds = new Set(data.links.map((l) => l.id));
  const newCols = file.data.collections.filter((c) => !colIds.has(c.id));
  const newLinks = file.data.links.filter((l) => !linkIds.has(l.id));
  await saveData({ collections: [...data.collections, ...newCols], links: [...newLinks, ...data.links] });
  return { links: newLinks.length, collections: newCols.length };
}

/** Import a Netscape bookmarks HTML file (Chrome/Edge/Firefox export). Folders become collections. */
export async function importBookmarksHtml(html: string): Promise<{ links: number; collections: number }> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchors = [...doc.querySelectorAll('a[href]')] as HTMLAnchorElement[];
  const data = await loadData();
  const now = Date.now();
  const cols = [...data.collections];
  const links = [...data.links];
  let addedCols = 0;
  let addedLinks = 0;
  const existing = new Set(links.filter((l) => !l.deletedAt).map((l) => canonicalUrl(l.url)));

  const folderOf = (a: Element): string => {
    // <DL><DT><H3>Folder</H3><DL> ... <DT><A>
    let dl = a.closest('dl');
    while (dl) {
      const h3 = dl.previousElementSibling?.tagName === 'H3' ? dl.previousElementSibling : dl.parentElement?.querySelector(':scope > h3');
      const t = h3?.textContent?.trim();
      if (t) return t;
      dl = dl.parentElement?.closest('dl') ?? null;
    }
    return 'Imported bookmarks';
  };

  for (const a of anchors) {
    const url = normalizeUrl(a.getAttribute('href') || '');
    if (!url || !/^https?:/i.test(url)) continue;
    const key = canonicalUrl(url);
    if (existing.has(key)) continue;
    existing.add(key);
    const folder = folderOf(a);
    let col = cols.find((c) => c.name === folder && !c.isSharedImport);
    if (!col) {
      col = {
        id: uid(), name: folder, color: '#1a73e8', parentId: null, visibility: 'private', sections: [],
        shareSettings: defaultShare(), createdAt: now, updatedAt: now,
      };
      cols.push(col);
      addedCols++;
    }
    links.unshift({
      id: uid(), url, title: a.textContent?.trim() || new URL(url).hostname, favicon: faviconFor(url),
      collectionId: col.id, sectionId: null, visibility: 'public', tags: [], createdAt: now, updatedAt: now,
    });
    addedLinks++;
  }
  await saveData({ collections: cols, links });
  return { links: addedLinks, collections: addedCols };
}

/* ---------- Duplicate links / sections / collections ---------- */

const copyName = (name: string) => (/\(copy( \d+)?\)$/.test(name) ? name : `${name} (copy)`);

/** Insert copies of the given links (same collection and section). Bypasses duplicate-URL checks on purpose. */
export async function duplicateLinks(ids: string[]): Promise<string[]> {
  const data = await loadData();
  const now = Date.now();
  const copies: LinkItem[] = [];
  for (const id of ids) {
    const l = data.links.find((x) => x.id === id);
    if (!l) continue;
    copies.push({
      ...l,
      id: uid(),
      title: copyName(l.title),
      isPinned: false,
      linkStatus: undefined,
      checkedAt: undefined,
      deletedAt: null,
      order: l.order !== undefined ? l.order + 1 : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }
  await saveData({ ...data, links: [...copies, ...data.links] });
  return copies.map((c) => c.id);
}

/** Copy a section (and its links) inside the same collection. */
export async function duplicateSection(collectionId: string, sectionId: string): Promise<Section | null> {
  const data = await loadData();
  const col = data.collections.find((c) => c.id === collectionId);
  const sec = col?.sections?.find((x) => x.id === sectionId);
  if (!col || !sec) return null;
  const now = Date.now();
  const copy: Section = { id: uid(), name: copyName(sec.name) };
  const idx = (col.sections ?? []).findIndex((x) => x.id === sectionId);
  const sections = [...(col.sections ?? [])];
  sections.splice(idx + 1, 0, copy);
  const links = data.links
    .filter((l) => !l.deletedAt && l.collectionId === collectionId && l.sectionId === sectionId)
    .map((l): LinkItem => ({ ...l, id: uid(), sectionId: copy.id, isPinned: false, createdAt: now, updatedAt: now }));
  await saveData({
    collections: data.collections.map((c) => (c.id === collectionId ? { ...c, sections, updatedAt: now } : c)),
    links: [...links, ...data.links],
  });
  return copy;
}

/** Copy a collection with its sections and links. The copy is private and not shared. */
export async function duplicateCollection(id: string): Promise<Collection | null> {
  const data = await loadData();
  const src = data.collections.find((c) => c.id === id);
  if (!src) return null;
  const now = Date.now();
  const sectionMap = new Map<string, string>();
  const sections: Section[] = (src.sections ?? []).map((x) => {
    const nid = uid();
    sectionMap.set(x.id, nid);
    return { ...x, id: nid };
  });
  const copy: Collection = {
    ...src,
    id: uid(),
    name: copyName(src.name),
    visibility: 'private',
    sections,
    isSharedImport: false,
    importedRole: undefined,
    shareSettings: defaultShare(),
    createdAt: now,
    updatedAt: now,
  };
  const links = data.links
    .filter((l) => !l.deletedAt && l.collectionId === id)
    .map((l): LinkItem => ({
      ...l,
      id: uid(),
      collectionId: copy.id,
      sectionId: l.sectionId ? sectionMap.get(l.sectionId) ?? null : null,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    }));
  await saveData({ collections: [...data.collections, copy], links: [...links, ...data.links] });
  return copy;
}

/** Remove a collection and permanently drop its links (used to undo a duplicate). */
export async function removeCollectionWithLinks(id: string) {
  if (id === DEFAULT_COLLECTION_ID) return;
  const data = await loadData();
  await saveData({
    collections: data.collections.filter((c) => c.id !== id),
    links: data.links.filter((l) => l.collectionId !== id),
  });
}

/** Remove a section and permanently drop its links (used to undo a duplicate). */
export async function removeSectionWithLinks(collectionId: string, sectionId: string) {
  const data = await loadData();
  await saveData({
    collections: data.collections.map((c) =>
      c.id === collectionId ? { ...c, sections: (c.sections ?? []).filter((x) => x.id !== sectionId) } : c,
    ),
    links: data.links.filter((l) => !(l.collectionId === collectionId && l.sectionId === sectionId)),
  });
}
