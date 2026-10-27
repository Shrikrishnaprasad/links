import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, Check, Cloud, CloudOff, FolderInput, FolderPlus, Folder, Inbox, Link2, Loader2,
  Plus, Search, Share2, Star, Tag, Trash2, Users, X, Download, LayoutGrid, List, Lock, Globe, ChevronDown, ChevronRight, Pencil, Layers, Pin, CopyPlus, Upload, Copy as CopyIcon, Unlink, ShieldCheck,
} from 'lucide-react';
import { useAppData, useSyncState, useToast } from '../components/hooks';
import { LinkCard } from '../components/LinkCard';
import { AddLinkModal } from '../components/AddLinkModal';
import { ShareModal } from '../components/ShareModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useT } from '../services/i18n';
import { getSettings, setSettings } from '../services/settings';
import { LinkDetails } from '../components/LinkDetails';
import { VirtualRows } from '../components/VirtualRows';
import { BulkTagsModal, ManageTagsModal } from '../components/TagModals';
import { EmptyState, Field, ListSkeleton, Modal, Toast } from '../components/ui';
import {
  addCollection, addLink, deleteCollection, deleteLinksForever, moveLinks, trashLinks,
  updateCollection, updateLink, addSection, updateSection, deleteSection, moveLinksToSection, setLinksVisibility,
  removeCollectionWithLinks, removeSectionWithLinks, type CheckResult, duplicateLinks, duplicateSection, duplicateCollection, groupDuplicates, canonicalUrl, patchLinks, setLinkStatuses, reorderLinks, exportBackup, toCsv, importBackup, importBookmarksHtml,
} from '../services/storage';
import { canFetchPages, checkLink, hasPagePermission, pool, requestPagePermission } from '../services/meta';
import { copyText } from '../services/clipboard';
import { decodeShare, type SharePayload } from '../services/sharing';
import { DEFAULT_COLLECTION_ID, collectionVisibility, linkVisibility, type LinkItem, type Section } from '../types/links';

type View =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'pinned' }
  | { type: 'shared' }
  | { type: 'trash' }
  | { type: 'duplicates' }
  | { type: 'broken' }
  | { type: 'collection'; id: string }
  | { type: 'tag'; tag: string };

export function DashboardApp() {
  const data = useAppData();
  const sync = useSyncState();
  const t = useT();
  const { msg, action, show, dismiss } = useToast();
  const [view, setView] = useState<View>({ type: 'all' });
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LinkItem | undefined>();
  const [sharing, setSharing] = useState(false);
  const [newCol, setNewCol] = useState(false);
  const [colName, setColName] = useState('');
  const [moving, setMoving] = useState(false);
  const [sectionDlg, setSectionDlg] = useState<{ id?: string } | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [addInSection, setAddInSection] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<SharePayload | null>(null);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [layout, setLayout] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('linkvault:layout') as 'list' | 'grid') || 'list',
  );
  const [sort, setSort] = useState<'created' | 'title' | 'manual'>('created');
  const [ioOpen, setIoOpen] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkTags, setBulkTags] = useState(false);
  const [manageTags, setManageTags] = useState(false);
  const [checking, setChecking] = useState<{ done: number; total: number } | null>(null);
  const [dropOver, setDropOver] = useState<string | null>(null);
  const dragIds = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const changeLayout = (l: 'list' | 'grid') => {
    setLayout(l);
    localStorage.setItem('linkvault:layout', l);
  };

  // Open shared link: dashboard.html#share=lv1.xxx
  useEffect(() => {
    const check = () => {
      const m = location.hash.match(/share=([^&]+)/);
      if (m) setIncoming(decodeShare(m[1]));
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  useEffect(() => setSelected(new Set()), [view]);

  useEffect(() => {
    getSettings().then((st) => setAutoCheck(st.autoCheck));
    // The background health check may have put a count on the toolbar icon; opening the dashboard clears it.
    if (typeof chrome !== 'undefined' && chrome.action) chrome.action.setBadgeText({ text: '' });
  }, []);

  const toggleAutoCheck = async () => {
    const next = !autoCheck;
    if (next && !(await hasPagePermission()) && !(await requestPagePermission())) {
      return show('Permission is needed to check links in the background');
    }
    setAutoCheck(next);
    await setSettings({ autoCheck: next });
    show(next ? 'Links will be checked automatically' : 'Automatic checking is off');
  };

  const live = useMemo(() => data?.links.filter((l) => !l.deletedAt) ?? [], [data]);
  const dupCount = useMemo(() => groupDuplicates(live).reduce((n, g) => n + g.length, 0), [live]);
  const brokenCount = useMemo(() => live.filter((l) => l.linkStatus === 'broken').length, [live]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    live.forEach((l) => l.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);

  const visible = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    const sharedIds = new Set(data.collections.filter((c) => c.isSharedImport).map((c) => c.id));
    let list = view.type === 'trash' ? data.links.filter((l) => l.deletedAt) : live;
    if (view.type === 'favorites') list = list.filter((l) => l.isFavorite);
    if (view.type === 'pinned') list = list.filter((l) => l.isPinned);
    if (view.type === 'shared') list = list.filter((l) => sharedIds.has(l.collectionId));
    if (view.type === 'collection') list = list.filter((l) => l.collectionId === view.id);
    if (view.type === 'tag') list = list.filter((l) => l.tags.includes(view.tag));
    if (view.type === 'duplicates') list = groupDuplicates(live).flat();
    if (view.type === 'broken') list = list.filter((l) => l.linkStatus === 'broken');
    if (s) list = list.filter((l) => `${l.title} ${l.url} ${l.description ?? ''} ${l.tags.join(' ')}`.toLowerCase().includes(s));
    if (view.type === 'duplicates') {
      // Keep copies of the same URL next to each other.
      return [...list].sort(
        (a, b) => canonicalUrl(a.url).localeCompare(canonicalUrl(b.url)) || a.createdAt - b.createdAt,
      );
    }
    if (sort === 'manual') {
      return [...list].sort(
        (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || b.createdAt - a.createdAt,
      );
    }
    return [...list].sort(
      (a, b) =>
        Number(!!b.isPinned) - Number(!!a.isPinned) ||
        (sort === 'title' ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt),
    );
  }, [data, live, view, q, sort]);

  if (!data)
    return (
      <div className="h-screen flex flex-col">
        <header className="h-16 flex items-center px-4"><div className="skeleton h-10 w-40" /></header>
        <div className="flex flex-1 min-h-0"><div className="w-56 p-2 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded-full" />)}</div>
          <main className="flex-1 bg-g-bg rounded-2xl mr-4 mb-4"><ListSkeleton /></main></div>
      </div>
    );

  const mine = data.collections.filter((c) => !c.isSharedImport);
  const sharedCols = data.collections.filter((c) => c.isSharedImport);
  const currentCol = view.type === 'collection' ? data.collections.find((c) => c.id === view.id) : undefined;
  const readOnly = currentCol?.isSharedImport && currentCol.importedRole === 'viewer';
  const title =
    view.type === 'all' ? 'All links'
    : view.type === 'favorites' ? 'Favorites'
    : view.type === 'pinned' ? 'Pinned'
    : view.type === 'shared' ? 'Shared with me'
    : view.type === 'trash' ? 'Trash'
    : view.type === 'duplicates' ? 'Duplicates'
    : view.type === 'broken' ? 'Broken links'
    : view.type === 'tag' ? `#${view.tag}`
    : currentCol?.name ?? '';

  const toggle = (id: string, on: boolean) =>
    setSelected((p) => {
      const n = new Set(p);
      on ? n.add(id) : n.delete(id);
      return n;
    });

  const importShared = async () => {
    if (!incoming) return;
    const names = [...new Set(incoming.links.map((l) => l.section).filter((x): x is string => !!x))];
    const sections: Section[] = names.map((name) => ({ id: crypto.randomUUID(), name }));
    const col = await addCollection(incoming.name, {
      isSharedImport: true,
      importedRole: incoming.role,
      visibility: 'public',
      sections,
    });
    for (const l of incoming.links) {
      await addLink({
        url: l.url, title: l.title, tags: l.tags, description: l.description, collectionId: col.id,
        sectionId: sections.find((x) => x.name === l.section)?.id ?? null,
      });
    }
    setIncoming(null);
    history.replaceState(null, '', location.pathname);
    setView({ type: 'collection', id: col.id });
    show(`Added "${incoming.name}" to Shared with me`);
  };

  const trashWithUndo = async (ids: string[]) => {
    await trashLinks(ids);
    setSelected(new Set());
    show(ids.length === 1 ? 'Moved to trash' : `Moved ${ids.length} links to trash`, {
      label: t('toast.undo'),
      onClick: () => trashLinks(ids, true),
    });
  };

  const moveWithUndo = async (ids: string[], collectionId: string, name: string) => {
    const prev = data.links.filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, collectionId: l.collectionId, sectionId: l.sectionId ?? null }));
    await moveLinks(ids, collectionId);
    setSelected(new Set());
    show(`Moved ${ids.length} link${ids.length > 1 ? 's' : ''} to ${name}`, { label: t('toast.undo'), onClick: () => patchLinks(prev) });
  };

  const sectionWithUndo = async (ids: string[], sectionId: string | null, name: string) => {
    const prev = data.links.filter((l) => ids.includes(l.id)).map((l) => ({ id: l.id, sectionId: l.sectionId ?? null }));
    await moveLinksToSection(ids, sectionId);
    setSelected(new Set());
    show(`Moved to ${name}`, { label: t('toast.undo'), onClick: () => patchLinks(prev) });
  };

  const dropOnCard = async (targetId: string, items: LinkItem[], sectionId: string | null | undefined) => {
    const dragged = dragIds.current.filter((id) => id !== targetId);
    dragIds.current = [];
    setDropOver(null);
    if (!dragged.length) return;
    const prev = data.links.filter((l) => dragged.includes(l.id)).map((l) => ({ id: l.id, sectionId: l.sectionId ?? null, order: l.order }));
    const base = items.map((l) => l.id).filter((id) => !dragged.includes(id));
    const idx = Math.max(0, base.indexOf(targetId));
    if (sectionId !== undefined) await moveLinksToSection(dragged, sectionId);
    await reorderLinks([...base.slice(0, idx), ...dragged, ...base.slice(idx)]);
    setSort('manual');
    show('Order updated', { label: t('toast.undo'), onClick: () => patchLinks(prev) });
  };

  const runCheck = async (list: LinkItem[]) => {
    if (!canFetchPages()) return show('Link checking works in the installed extension');
    if (!navigator.onLine) return show('You appear to be offline. Try again when connected.');
    if (!(await hasPagePermission()) && !(await requestPagePermission())) return show('Permission is needed to check links');
    const targets = list.filter((l) => /^https?:/i.test(l.url));
    if (!targets.length) return show('No links to check');
    setChecking({ done: 0, total: targets.length });
    const results: CheckResult[] = [];
    let done = 0;
    await pool(targets, 5, async (l) => {
      results.push({ id: l.id, ...(await checkLink(l.url)) });
      setChecking({ done: ++done, total: targets.length });
    });
    setChecking(null);
    // Every request failed without any HTTP response: almost certainly no connection, so don't flag anything.
    if (results.length >= 3 && results.every((r) => r.status === 'broken' && r.code === undefined)) {
      return show("Couldn't reach any site. Check your connection and try again.");
    }
    await setLinkStatuses(results);
    const broken = results.filter((r) => r.status === 'broken').length;
    show(
      broken ? `${broken} broken link${broken > 1 ? 's' : ''} found` : `All ${targets.length} links look fine`,
      broken ? { label: 'Review', onClick: () => setView({ type: 'broken' }) } : undefined,
    );
  };

  const trashExtraCopies = () => {
    const extras = groupDuplicates(live).flatMap((g) => [...g].sort((a, b) => a.createdAt - b.createdAt).slice(1).map((l) => l.id));
    if (extras.length) trashWithUndo(extras);
  };

  const download = (name: string, text: string, type: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const stamp = () => new Date().toISOString().slice(0, 10);

  const importFile = async (f: File) => {
    try {
      const text = await f.text();
      const r = /\.json$/i.test(f.name) ? await importBackup(JSON.parse(text)) : await importBookmarksHtml(text);
      show(`Imported ${r.links} link${r.links === 1 ? '' : 's'}${r.collections ? ` and ${r.collections} collection${r.collections > 1 ? 's' : ''}` : ''}`);
      setIoOpen(false);
    } catch (e) {
      show((e as Error).message || 'Could not import this file');
    }
  };

  const groups: Array<{ id: string | null; name: string; section?: Section }> =
    currentCol && (currentCol.sections?.length ?? 0) > 0 && view.type === 'collection'
      ? [{ id: null, name: 'No section' }, ...currentCol.sections!.map((x) => ({ id: x.id, name: x.name, section: x }))]
      : [{ id: null, name: '' }];

  const renderCard = (l: LinkItem, items: LinkItem[] = visible, sectionId?: string | null) => {
    const canDrag = !readOnly && view.type !== 'trash' && view.type !== 'duplicates';
    return (
      <LinkCard
        key={l.id}
        link={l}
        variant={layout === 'grid' ? 'grid' : 'row'}
        collectionName={data.collections.find((c) => c.id === l.collectionId)?.name}
        readOnly={readOnly}
        selected={selected.has(l.id)}
        onSelect={(c) => toggle(l.id, c)}
        onCopy={async () => { await copyText(l.url); show(t('toast.copied')); }}
        onPin={() => updateLink(l.id, { isPinned: !l.isPinned })}
        onFavorite={() => updateLink(l.id, { isFavorite: !l.isFavorite })}
        onDetails={() => setDetailId(l.id)}
        onDuplicate={async () => {
          const ids = await duplicateLinks([l.id]);
          show(t('toast.duplicated'), { label: t('toast.undo'), onClick: () => trashLinks(ids) });
        }}
        onToggleVisibility={() => updateLink(l.id, { visibility: linkVisibility(l) === 'private' ? 'public' : 'private' })}
        onEdit={() => setEditing(l)}
        onTrash={() => trashWithUndo([l.id])}
        onRestore={view.type === 'trash' ? () => trashLinks([l.id], true) : undefined}
        drag={
          canDrag
            ? {
                draggable: true,
                onDragStart: (e) => {
                  dragIds.current = selected.has(l.id) ? [...selected] : [l.id];
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', l.url);
                },
                onDragEnd: () => { dragIds.current = []; setDropOver(null); },
                onDragOver: (e) => { if (dragIds.current.length) { e.preventDefault(); setDropOver('card:' + l.id); } },
                onDrop: (e) => { e.preventDefault(); dropOnCard(l.id, items, sectionId); },
              }
            : undefined
        }
        dropActive={dropOver === 'card:' + l.id}
      />
    );
  };

  const NavItem = ({ active, onClick, icon, label, count, onDropLinks, dropKey }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number; onDropLinks?: () => void; dropKey?: string }) => (
    <button
      onClick={onClick}
      onDragOver={onDropLinks ? (e) => { if (dragIds.current.length) { e.preventDefault(); setDropOver(dropKey ?? null); } } : undefined}
      onDragLeave={onDropLinks ? () => setDropOver(null) : undefined}
      onDrop={onDropLinks ? (e) => { e.preventDefault(); setDropOver(null); onDropLinks(); dragIds.current = []; } : undefined}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 h-8 px-3 rounded-full text-[13px] text-left transition-colors ${
        dropKey && dropOver === dropKey ? 'ring-2 ring-g-blue bg-g-blueSoft' : ''
      } ${active ? 'bg-g-nav text-g-onTonal font-medium' : 'hover:bg-g-hover text-g-text'}`}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-xs text-g-sub">{count}</span>}
    </button>
  );
  const countIn = (id: string) => live.filter((l) => l.collectionId === id).length;
  const isActive = (t: View) => JSON.stringify(t) === JSON.stringify(view);

  const SyncBadge = () => {
    const base = 'flex items-center gap-1.5 text-xs text-g-sub px-3';
    if (sync.status === 'local-only') return <span className={base}><CloudOff size={12} /> Local only</span>;
    if (sync.status === 'syncing') return <span className={base}><Loader2 size={12} className="animate-spin" /> Syncing…</span>;
    if (sync.status === 'error') return <span className={`${base} !text-g-red`} title={sync.message}><AlertCircle size={12} /> Sync issue</span>;
    return <span className={base}><Cloud size={12} /> {sync.status === 'synced' ? 'Synced' : 'Sync on'}</span>;
  };

  return (
    <div className="h-screen flex flex-col">
      <button
        className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:top-2 focus:left-2 focus:bg-g-bg focus:text-g-blue focus:px-4 focus:py-2 focus:rounded-full focus:shadow-g2"
        onClick={() => document.getElementById('main')?.focus()}
      >
        {t('skip')}
      </button>
      <div className="sr-only" role="status" aria-live="polite">
        {checking ? `Checking links ${checking.done} of ${checking.total}` : ''}
      </div>
      {/* Top bar */}
      <header className="h-14 flex items-center gap-4 pl-4 pr-4">
        <div className="flex items-center gap-2.5 w-52">
          <div className="w-8 h-8 rounded-lg bg-g-bg shadow-g1 grid place-items-center">
            <Link2 size={18} className="text-g-blue" />
          </div>
          <span className="text-[18px] text-g-sub">LinkVault</span>
        </div>
        <div className="relative flex-1 max-w-3xl">
          <Search size={18} className="absolute left-3.5 top-2.5 text-g-sub" />
          <input
            className="w-full h-10 rounded-full bg-g-surface pl-10 pr-4 text-[13px] placeholder:text-g-sub focus:bg-g-bg focus:shadow-g1 focus:outline-none transition-shadow"
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-1"><SyncBadge /><LanguageSwitcher /><ThemeToggle /></div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 py-1 px-2 overflow-auto" aria-label={t('nav.label')}>
          <div className="pb-4 pl-1">
            <button className="h-11 pl-3 pr-5 rounded-xl bg-g-tonal text-g-onTonal hover:shadow-g2 transition-shadow flex items-center gap-3 font-medium text-[13px]" onClick={() => setAdding(true)}>
              <Plus size={20} /> {t('action.newLink')}
            </button>
          </div>
          <NavItem active={isActive({ type: 'all' })} onClick={() => setView({ type: 'all' })} icon={<Link2 size={16} />} label={t('nav.all')} count={live.length} />
          <NavItem active={isActive({ type: 'pinned' })} onClick={() => setView({ type: 'pinned' })} icon={<Pin size={16} />} label={t('nav.pinned')} count={live.filter((l) => l.isPinned).length || undefined} />
          <NavItem active={isActive({ type: 'favorites' })} onClick={() => setView({ type: 'favorites' })} icon={<Star size={16} />} label={t('nav.favorites')} count={live.filter((l) => l.isFavorite).length || undefined} />
          <NavItem active={isActive({ type: 'shared' })} onClick={() => setView({ type: 'shared' })} icon={<Users size={16} />} label={t('nav.shared')} />
          <NavItem active={isActive({ type: 'duplicates' })} onClick={() => setView({ type: 'duplicates' })} icon={<CopyIcon size={16} />} label={t('nav.duplicates')} count={dupCount || undefined} />
          {(brokenCount > 0 || view.type === 'broken') && (
            <NavItem active={isActive({ type: 'broken' })} onClick={() => setView({ type: 'broken' })} icon={<Unlink size={16} />} label={t('nav.broken')} count={brokenCount} />
          )}
          <NavItem active={isActive({ type: 'trash' })} onClick={() => setView({ type: 'trash' })} icon={<Trash2 size={16} />} label={t('nav.trash')} />

          <div className="flex items-center justify-between pl-4 pr-2 mt-5 mb-1 text-xs font-medium text-g-sub uppercase tracking-wide">
            {t('nav.collections')}
            <button className="icon-btn" aria-label="New collection" onClick={() => setNewCol(true)}><FolderPlus size={14} /></button>
          </div>
          {mine.map((c) => (
            <NavItem
              key={c.id}
              active={isActive({ type: 'collection', id: c.id })}
              onClick={() => setView({ type: 'collection', id: c.id })}
              icon={c.id === DEFAULT_COLLECTION_ID ? <Inbox size={16} /> : <Folder size={16} style={{ color: c.color }} />}
              label={c.name}
              count={countIn(c.id)}
              dropKey={'col:' + c.id}
              onDropLinks={() => moveWithUndo([...dragIds.current], c.id, c.name)}
            />
          ))}
          {sharedCols.length > 0 && (
            <>
              <div className="pl-4 mt-5 mb-1 text-xs font-medium text-g-sub uppercase tracking-wide">{t('nav.sharedGroup')}</div>
              {sharedCols.map((c) => (
                <NavItem
                  key={c.id}
                  active={isActive({ type: 'collection', id: c.id })}
                  onClick={() => setView({ type: 'collection', id: c.id })}
                  icon={<Users size={16} />}
                  label={c.name}
                  count={countIn(c.id)}
                />
              ))}
            </>
          )}
          {tags.length > 0 && (
            <>
              <div className="flex items-center justify-between pl-4 pr-2 mt-5 mb-1 text-xs font-medium text-g-sub uppercase tracking-wide">
                {t('nav.tags')}
                <button className="icon-btn-sm" aria-label="Manage tags" title="Manage tags" onClick={() => setManageTags(true)}><Pencil size={12} /></button>
              </div>
              {tags.map(([t, n]) => (
                <NavItem key={t} active={isActive({ type: 'tag', tag: t })} onClick={() => setView({ type: 'tag', tag: t })} icon={<Tag size={16} />} label={t} count={n} />
              ))}
            </>
          )}
          <div className="pl-3 mt-5 flex flex-col items-start gap-1">
            <button className="btn-text" onClick={() => setImporting(true)}><Download size={14} /> {t('action.openShare')}</button>
            <button className="btn-text" onClick={() => setIoOpen(true)}><Upload size={14} /> {t('action.importExport')}</button>
          </div>
        </aside>

        {/* Main */}
        <main id="main" tabIndex={-1} className="flex-1 min-w-0 flex flex-col bg-g-bg rounded-2xl mr-4 mb-4 overflow-hidden focus:outline-none">
          {incoming && (
            <div className="m-4 mb-0 p-4 rounded-xl bg-g-blueSoft flex items-center gap-4">
              <Users className="text-g-blue" />
              <div className="flex-1">
                <div className="font-medium">"{incoming.name}" was shared with you</div>
                <div className="text-xs text-g-sub">{incoming.links.length} links · {incoming.role === 'editor' ? 'Editor' : 'Viewer'} access</div>
              </div>
              <button className="btn-text" onClick={() => { setIncoming(null); history.replaceState(null, '', location.pathname); }}>Dismiss</button>
              <button className="btn-primary" onClick={importShared}>Add to my account</button>
            </div>
          )}

          <div className={`flex items-center gap-2 px-4 h-12 shrink-0 ${selected.size > 0 ? 'm-2 mb-0 rounded-full bg-g-nav' : ''}`}>
            {selected.size > 0 ? (
              <>
                <button className="icon-btn" aria-label="Clear selection" onClick={() => setSelected(new Set())}><X size={16} /></button>
                <span className="text-sm font-medium flex-1">{t('toolbar.selected', { n: selected.size })}</span>
                {view.type === 'trash' ? (
                  <>
                    <button className="btn-text" onClick={() => { trashLinks([...selected], true); setSelected(new Set()); }}>{t('toolbar.restore')}</button>
                    <button className="btn-text !text-g-red" onClick={() => { deleteLinksForever([...selected]); setSelected(new Set()); }}>{t('toolbar.deleteForever')}</button>
                  </>
                ) : (
                  <>
                    <button className="btn-text" onClick={async () => { await copyText(visible.filter((l) => selected.has(l.id)).map((l) => l.url).join('\n')); show('Links copied'); }}>{t('common.copy')}</button>
                    <button className="btn-text" onClick={() => runCheck(visible.filter((l) => selected.has(l.id)))} disabled={!!checking}><ShieldCheck size={14} /> {t('toolbar.checkLinks')}</button>
                    {!readOnly && <button className="btn-text" onClick={() => setBulkTags(true)}><Tag size={14} /> {t('col.tags')}</button>}
                    {!readOnly && <button className="btn-text" onClick={() => { setLinksVisibility([...selected], 'private'); show('Marked private'); }}><Lock size={14} /> Private</button>}
                    {!readOnly && <button className="btn-text" onClick={() => { setLinksVisibility([...selected], 'public'); show('Marked public'); }}><Globe size={14} /> Public</button>}
                    {!readOnly && currentCol && (currentCol.sections?.length ?? 0) > 0 && (
                      <select
                        className="chip !h-8 !text-g-blue bg-transparent"
                        aria-label="Move to section"
                        value=""
                        onChange={(e) => { if (e.target.value) { sectionWithUndo([...selected], e.target.value === '__none' ? null : e.target.value, e.target.value === '__none' ? 'No section' : currentCol.sections!.find((x) => x.id === e.target.value)?.name ?? 'section'); } }}
                      >
                        <option value="">Section...</option>
                        <option value="__none">No section</option>
                        {currentCol.sections!.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    )}
                    {!readOnly && <button className="btn-text" onClick={() => setMoving(true)}><FolderInput size={14} /> {t('common.move')}</button>}
                    {!readOnly && <button className="btn-text" onClick={() => trashWithUndo([...selected])}><Trash2 size={14} /> {t('common.trash')}</button>}
                  </>
                )}
              </>
            ) : (
              <>
                <h1 className="text-[18px] font-normal flex-1 truncate">{title}</h1>
                {view.type === 'trash' && visible.length > 0 && (
                  <button className="btn-text !text-g-red" onClick={() => deleteLinksForever(visible.map((l) => l.id))}>{t('toolbar.emptyTrash')}</button>
                )}
                {currentCol && !currentCol.isSharedImport && (
                  <>
                    <button className="btn-text" onClick={() => { const n = prompt('Rename collection', currentCol.name); if (n && n.trim()) updateCollection(currentCol.id, { name: n.trim() }); }}>{t('common.rename')}</button>
                    <button
                      className="btn-text"
                      title="Copy this collection with its sections and links"
                      onClick={async () => {
                        const copy = await duplicateCollection(currentCol.id);
                        if (copy) {
                          setView({ type: 'collection', id: copy.id });
                          show(`Duplicated as "${copy.name}"`, { label: t('toast.undo'), onClick: () => { removeCollectionWithLinks(copy.id); setView({ type: 'collection', id: currentCol.id }); } });
                        }
                      }}
                    ><CopyPlus size={14} /> {t('common.duplicate')}</button>
                    {currentCol.id !== DEFAULT_COLLECTION_ID && (
                      <>
                        <button className="btn-text !text-g-red" onClick={() => { if (confirm(`Delete "${currentCol.name}"? Its links move to the default collection.`)) { deleteCollection(currentCol.id); setView({ type: 'all' }); } }}>{t('common.delete')}</button>
                      </>
                    )}
                    <button
                      className="chip !h-8"
                      onClick={() => updateCollection(currentCol.id, { visibility: collectionVisibility(currentCol) === 'private' ? 'public' : 'private' })}
                      title="Toggle collection visibility"
                    >
                      {collectionVisibility(currentCol) === 'private' ? <><Lock size={12} /> {t('common.private')}</> : <><Globe size={12} /> {t('common.public')}</>}
                    </button>
                    <button className="btn-tonal" onClick={() => setSharing(true)}><Share2 size={14} /> {t('common.share')}</button>
                  </>
                )}
                {view.type === 'duplicates' && visible.length > 0 && (
                  <button className="btn-tonal" onClick={trashExtraCopies}><Trash2 size={14} /> {t('toolbar.trashExtra')}</button>
                )}
                {view.type !== 'trash' && view.type !== 'duplicates' && visible.length > 0 && (
                  <button className="btn-text" onClick={() => runCheck(visible)} disabled={!!checking} title="Find links that no longer work">
                    {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    {checking ? `Checking ${checking.done}/${checking.total}` : t('toolbar.checkLinks')}
                  </button>
                )}
                {currentCol && !readOnly && (
                  <button className="btn-text" onClick={() => { setSectionName(''); setSectionDlg({}); }}><Layers size={14} /> {t('toolbar.newSection')}</button>
                )}
                {readOnly && <span className="text-xs text-g-sub px-3 py-1 rounded-full bg-g-hover">View only</span>}
                <div className="flex rounded-full border border-g-border overflow-hidden ml-2" role="group" aria-label="Layout">
                  <button
                    className={`w-10 h-7 grid place-items-center ${layout === 'list' ? 'bg-g-nav text-g-onTonal' : 'hover:bg-g-hover text-g-sub'}`}
                    onClick={() => changeLayout('list')} aria-pressed={layout === 'list'} aria-label="List layout" title="List layout"
                  ><List size={16} /></button>
                  <button
                    className={`w-10 h-7 grid place-items-center border-l border-g-border ${layout === 'grid' ? 'bg-g-nav text-g-onTonal' : 'hover:bg-g-hover text-g-sub'}`}
                    onClick={() => changeLayout('grid')} aria-pressed={layout === 'grid'} aria-label="Grid layout" title="Grid layout"
                  ><LayoutGrid size={16} /></button>
                </div>
              </>
            )}
          </div>

          {selected.size === 0 && (
            <div className="flex items-center gap-2 px-4 pb-3 shrink-0 overflow-x-auto">
              <button className={`chip ${sort === 'created' ? 'chip-active' : ''}`} onClick={() => setSort('created')} aria-pressed={sort === 'created'}>{t('sort.recent')}</button>
              <button className={`chip ${sort === 'title' ? 'chip-active' : ''}`} onClick={() => setSort('title')} aria-pressed={sort === 'title'}>{t('sort.name')}</button>
              <button className={`chip ${sort === 'manual' ? 'chip-active' : ''}`} onClick={() => setSort('manual')} title="Drag links to arrange them" aria-pressed={sort === 'manual'}>{t('sort.manual')}</button>
            </div>
          )}

          {layout === 'list' && visible.length > 0 && (
            <div className="grid grid-cols-[28px_minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_88px_276px] gap-3 px-4 h-9 items-center text-xs font-medium text-g-sub border-b border-g-border">
              <input
                type="checkbox"
                className="w-4 h-4 accent-g-blue"
                aria-label="Select all"
                checked={selected.size === visible.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((l) => l.id)) : new Set())}
              />
              <span>{t('col.name')}</span><span>{t('col.collection')}</span><span>{t('col.tags')}</span><span>{t('col.added')}</span><span />
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-auto">
            {visible.length === 0 && !(currentCol && (currentCol.sections?.length ?? 0) > 0 && !q) ? (
              <EmptyState
                title={q ? t('empty.noMatches') : view.type === 'trash' ? t('empty.trash') : view.type === 'duplicates' ? 'No duplicates found' : view.type === 'broken' ? 'No broken links' : view.type === 'favorites' ? t('empty.favorites') : view.type === 'pinned' ? t('empty.pinned') : view.type === 'shared' ? 'Nothing shared with you' : t('empty.noLinks')}
                body={
                  q ? 'Try a different search term.'
                  : view.type === 'trash' ? 'Links you delete show up here until you empty the trash.'
                  : view.type === 'duplicates' ? 'Links that point to the same page will appear here.'
                  : view.type === 'broken' ? 'Run "Check links" to find pages that no longer load.'
                  : view.type === 'favorites' ? 'Star a link to add it to your favorites.'
                  : view.type === 'pinned' ? 'Pin a link to keep it at the top of its list and find it here.'
                  : view.type === 'shared' ? 'Open a share link to add someone else\'s collection.'
                  : t('empty.noLinksBody')
                }
                action={
                  !q && !readOnly && ['all', 'collection', 'tag'].includes(view.type) ? (
                    <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add link</button>
                  ) : view.type === 'shared' ? (
                    <button className="btn-tonal" onClick={() => setImporting(true)}><Download size={16} /> {t('action.openShare')}</button>
                  ) : undefined
                }
              />
            ) : (
              groups.map((g) => {
                const items = visible.filter((l) =>
                  g.id ? l.sectionId === g.id : !l.sectionId || !currentCol?.sections?.some((x) => x.id === l.sectionId),
                );
                if (g.id === null && groups.length > 1 && items.length === 0) return null;
                const collapsed = !!g.section?.collapsed;
                return (
                  <section key={g.id ?? 'none'} aria-label={g.name || 'Links'}>
                    {groups.length > 1 && (
                      <div
                        className={`group/h flex items-center gap-1 pl-2 pr-4 h-10 border-b border-g-border/60 sticky top-0 bg-g-bg z-10 ${dropOver === 'sec:' + (g.id ?? 'none') ? 'ring-2 ring-inset ring-g-blue bg-g-blueSoft' : ''}`}
                        onDragOver={(e) => { if (dragIds.current.length && !readOnly) { e.preventDefault(); setDropOver('sec:' + (g.id ?? 'none')); } }}
                        onDragLeave={() => setDropOver(null)}
                        onDrop={(e) => { e.preventDefault(); setDropOver(null); const ids = [...dragIds.current]; dragIds.current = []; if (ids.length) sectionWithUndo(ids, g.id, g.name); }}
                      >
                        <button
                          className="icon-btn-sm"
                          aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                          aria-expanded={!collapsed}
                          onClick={() => g.section && currentCol && updateSection(currentCol.id, g.section.id, { collapsed: !collapsed })}
                          disabled={!g.section}
                        >
                          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <h2 className="text-[13px] font-medium">{g.name}</h2>
                        <span className="text-xs text-g-sub ml-1">{items.length}</span>
                        <div className="ml-auto flex opacity-0 group-hover/h:opacity-100 focus-within:opacity-100 transition-opacity">
                          {!readOnly && (
                            <button className="icon-btn-sm" aria-label="Add link to section" title="Add link" onClick={() => { setAddInSection(g.id); setAdding(true); }}><Plus size={16} /></button>
                          )}
                          {!readOnly && g.section && (
                            <>
                              <button className="icon-btn-sm" aria-label="Rename section" title="Rename" onClick={() => { setSectionName(g.section!.name); setSectionDlg({ id: g.section!.id }); }}><Pencil size={14} /></button>
                              <button
                                className="icon-btn-sm" aria-label="Duplicate section" title="Duplicate section"
                                onClick={async () => {
                                  const copy = await duplicateSection(currentCol!.id, g.section!.id);
                                  if (copy) show(`Duplicated as "${copy.name}"`, { label: t('toast.undo'), onClick: () => removeSectionWithLinks(currentCol!.id, copy.id) });
                                }}
                              ><CopyPlus size={14} /></button>
                              <button
                                className="icon-btn-sm" aria-label="Delete section" title="Delete section"
                                onClick={() => { if (confirm(`Delete section "${g.name}"? Its links stay in the collection.`)) deleteSection(currentCol!.id, g.section!.id); }}
                              ><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {!collapsed && (
                      items.length === 0 ? (
                        <p className="px-12 py-4 text-sm text-g-sub">No links in this section yet.</p>
                      ) : (
                        layout === 'list' && items.length > 60 ? (
                          <VirtualRows
                            items={items}
                            rowHeight={48}
                            scrollRef={scrollRef}
                            render={(l) => renderCard(l, items, groups.length > 1 ? g.id : undefined)}
                          />
                        ) : (
                          <div className={layout === 'grid' ? 'p-4 grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' : ''}>
                            {items.map((l) => renderCard(l, items, groups.length > 1 ? g.id : undefined))}
                          </div>
                        )
                      )
                    )}
                  </section>
                );
              })
            )}
          </div>
        </main>
        {detailId && data.links.find((l) => l.id === detailId) && (
          <LinkDetails
            link={data.links.find((l) => l.id === detailId)!}
            collections={data.collections}
            readOnly={readOnly}
            onClose={() => setDetailId(null)}
          />
        )}
      </div>

      {(adding || editing) && (
        <AddLinkModal
          collections={data.collections.filter((c) => !(c.isSharedImport && c.importedRole === 'viewer'))}
          defaultCollectionId={currentCol && !readOnly ? currentCol.id : DEFAULT_COLLECTION_ID}
          defaultSectionId={addInSection}
          editing={editing}
          onClose={() => { setAdding(false); setEditing(undefined); setAddInSection(null); }}
          onSaved={show}
        />
      )}
      {sharing && currentCol && (
        <ShareModal
          collection={currentCol}
          links={live.filter((l) => l.collectionId === currentCol.id)}
          onClose={() => setSharing(false)}
          onToast={show}
        />
      )}
      {newCol && (
        <Modal
          title={t('dlg.newCollection')}
          onClose={() => setNewCol(false)}
          footer={
            <>
              <button className="btn-text" onClick={() => setNewCol(false)}>{t('common.cancel')}</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!colName.trim()) return;
                  const c = await addCollection(colName);
                  setColName(''); setNewCol(false); setView({ type: 'collection', id: c.id });
                }}
              >{t('common.create')}</button>
            </>
          }
        >
          <div className="pt-2"><Field label={t('dlg.collectionName')} autoFocus value={colName} onChange={setColName} /></div>
        </Modal>
      )}
      {moving && (
        <Modal title={t('dlg.moveTo', { n: selected.size })} onClose={() => setMoving(false)}>
          <div className="space-y-1">
            {data.collections.filter((c) => !(c.isSharedImport && c.importedRole === 'viewer')).map((c) => (
              <button
                key={c.id}
                className="w-full flex items-center gap-3 h-10 px-3 rounded-lg hover:bg-g-hover text-left"
                onClick={async () => { setMoving(false); await moveWithUndo([...selected], c.id, c.name); }}
              >
                <Folder size={16} style={{ color: c.color }} /> {c.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {importing && (
        <Modal
          title={t('dlg.openShare')}
          onClose={() => setImporting(false)}
          footer={
            <>
              <button className="btn-text" onClick={() => setImporting(false)}>{t('common.cancel')}</button>
              <button
                className="btn-primary"
                onClick={() => {
                  const p = decodeShare(importText);
                  if (!p) return show('Not a valid LinkVault share link');
                  setIncoming(p); setImporting(false); setImportText('');
                }}
              ><Check size={14} /> {t('dlg.open')}</button>
            </>
          }
        >
          <div className="pt-2"><Field label={t('dlg.shareLink')} helper={t('dlg.shareLinkHelp')} autoFocus value={importText} onChange={setImportText} /></div>
        </Modal>
      )}
      {sectionDlg && currentCol && (
        <Modal
          title={sectionDlg.id ? t('dlg.renameSection') : t('dlg.newSection')}
          onClose={() => setSectionDlg(null)}
          footer={
            <>
              <button className="btn-text" onClick={() => setSectionDlg(null)}>{t('common.cancel')}</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!sectionName.trim()) return;
                  if (sectionDlg.id) await updateSection(currentCol.id, sectionDlg.id, { name: sectionName.trim() });
                  else await addSection(currentCol.id, sectionName);
                  setSectionDlg(null);
                }}
              >{sectionDlg.id ? t('common.save') : t('common.create')}</button>
            </>
          }
        >
          <div className="pt-2"><Field label={t('dlg.sectionName')} autoFocus value={sectionName} onChange={setSectionName} /></div>
        </Modal>
      )}
      {ioOpen && (
        <Modal title={t('io.title')} onClose={() => setIoOpen(false)} footer={<button className="btn-primary" onClick={() => setIoOpen(false)}>{t('common.done')}</button>}>
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="font-medium mb-1">{t('io.backup')}</h3>
              <p className="text-g-sub mb-3">{t('io.backupHelp')}</p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-tonal" onClick={async () => download(`linkvault-backup-${stamp()}.json`, JSON.stringify(await exportBackup(), null, 2), 'application/json')}>{t('io.exportJson')}</button>
                <button className="btn-outline" onClick={() => download(`linkvault-links-${stamp()}.csv`, toCsv(data), 'text/csv')}>{t('io.exportCsv')}</button>
              </div>
            </section>
            <section>
              <h3 className="font-medium mb-1">{t('io.import')}</h3>
              <p className="text-g-sub mb-3">{t('io.importHelp')}</p>
              <label className="btn-tonal cursor-pointer">
                <Upload size={14} /> {t('io.chooseFile')}
                <input
                  type="file"
                  accept=".json,.html,.htm"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }}
                />
              </label>
              <p className="text-xs text-g-sub mt-2">In Chrome: Bookmarks manager, then the menu, then "Export bookmarks".</p>
            </section>
            {canFetchPages() && (
              <section>
                <h3 className="font-medium mb-1">{t('io.health')}</h3>
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-g-sub">{t('io.healthHelp')}</p>
                  <button
                    role="switch"
                    aria-checked={autoCheck}
                    aria-label="Check links automatically"
                    onClick={toggleAutoCheck}
                    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${autoCheck ? 'bg-g-blue' : 'bg-g-border/70'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-g-bg shadow transition-transform ${autoCheck ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </section>
            )}
          </div>
        </Modal>
      )}
      {bulkTags && (
        <BulkTagsModal links={visible.filter((l) => selected.has(l.id))} onClose={() => setBulkTags(false)} onDone={(m) => { show(m); setSelected(new Set()); }} />
      )}
      {manageTags && <ManageTagsModal tags={tags} onClose={() => setManageTags(false)} onDone={show} />}
      <Toast msg={msg} action={action} onDismiss={dismiss} />
    </div>
  );
}
