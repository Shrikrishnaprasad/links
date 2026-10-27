import { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, LayoutDashboard, Plus, Search, Share2 } from 'lucide-react';
import { useAppData, useToast } from '../components/hooks';
import { LinkCard } from '../components/LinkCard';
import { ShareModal } from '../components/ShareModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { AddLinkModal } from '../components/AddLinkModal';
import { ListSkeleton, Toast } from '../components/ui';
import { addLink, normalizeUrl, trashLinks, updateLink } from '../services/storage';
import { copyText, readClipboard } from '../services/clipboard';
import { DEFAULT_COLLECTION_ID, linkVisibility, type LinkItem } from '../types/links';

export function PopupApp() {
  const data = useAppData();
  const { msg, action, show, dismiss } = useToast();
  const [q, setQ] = useState('');
  const [cid, setCid] = useState<string>('all');
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState<LinkItem | undefined>();

  // Dialogs need room: give the popup a taller canvas while one is open.
  useEffect(() => {
    document.body.style.minHeight = editing || sharing ? '600px' : '';
  }, [editing, sharing]);

  const saveCurrentTab = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return show('Not available outside the extension');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return show('No tab to save');
    await addLink({ url: tab.url, title: tab.title, collectionId: cid === 'all' ? DEFAULT_COLLECTION_ID : cid });
    show('Saved current tab');
  };

  const pasteFromClipboard = async () => {
    const text = (await readClipboard()).trim();
    if (!text || !normalizeUrl(text)) return show('Clipboard has no valid URL');
    await addLink({ url: text, collectionId: cid === 'all' ? DEFAULT_COLLECTION_ID : cid });
    show('Link saved from clipboard');
  };

  const links = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.links
      .filter((l) => !l.deletedAt)
      .filter((l) => cid === 'all' || l.collectionId === cid)
      .filter((l) => !s || `${l.title} ${l.url} ${l.tags.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned) || b.createdAt - a.createdAt);
  }, [data, q, cid]);

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    else window.open('dashboard.html', '_blank');
  };

  if (!data) return <div className="bg-g-bg"><div className="p-4"><div className="skeleton h-8 w-32" /></div><ListSkeleton rows={4} /></div>;
  const current = data.collections.find((c) => c.id === cid);

  return (
    <div className="flex flex-col max-h-[560px] bg-g-bg">
      <header className="flex items-center gap-2 pl-4 pr-2 pt-2 pb-1">
        <div className="w-7 h-7 rounded-lg bg-g-surface grid place-items-center text-g-blue font-medium">L</div>
        <h1 className="text-[16px] font-normal text-g-sub flex-1">LinkVault</h1>
        <ThemeToggle />
        {current && (
          <button className="icon-btn" onClick={() => setSharing(true)} title="Share collection" aria-label="Share collection">
            <Share2 size={16} />
          </button>
        )}
        <button className="icon-btn" onClick={openDashboard} title="Open dashboard" aria-label="Open dashboard">
          <LayoutDashboard size={16} />
        </button>
      </header>

      <div className="px-4 pb-2 flex gap-2">
        <button className="btn-primary flex-1" onClick={saveCurrentTab}>
          <Plus size={14} /> Save tab
        </button>
        <button className="btn-tonal flex-1" onClick={pasteFromClipboard}>
          <ClipboardPaste size={14} /> Paste link
        </button>
      </div>

      <div className="px-4 pb-2 relative">
        <Search size={16} className="absolute left-7 top-2.5 text-g-sub" />
        <input
          className="input !h-9 !pl-9 !rounded-full !bg-g-surface !border-transparent"
          placeholder="Search links"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        <button className={`chip ${cid === 'all' ? 'chip-active' : ''}`} onClick={() => setCid('all')}>All</button>
        {data.collections.map((c) => (
          <button
            key={c.id}
            className={`chip whitespace-nowrap ${cid === c.id ? 'chip-active' : ''}`}
            onClick={() => setCid(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-1 pb-2 border-t border-g-border">
        {links.length === 0 ? (
          <div className="text-center text-g-sub py-8 px-6">
            <p className="text-base text-g-text mb-1">No links yet</p>
            <p>Save the current tab or paste a link to get started.</p>
          </div>
        ) : (
          links.map((l) => (
            <LinkCard
              key={l.id}
              link={l}
              variant="compact"
              onCopy={async () => {
                await copyText(l.url);
                show('Link copied');
              }}
              onPin={() => updateLink(l.id, { isPinned: !l.isPinned })}
              onEdit={() => setEditing(l)}
              onToggleVisibility={() => updateLink(l.id, { visibility: linkVisibility(l) === 'private' ? 'public' : 'private' })}
              onTrash={async () => { await trashLinks([l.id]); show('Moved to trash', { label: 'Undo', onClick: () => trashLinks([l.id], true) }); }}
            />
          ))
        )}
      </div>

      {sharing && current && (
        <ShareModal
          collection={current}
          links={links}
          onClose={() => setSharing(false)}
          onToast={show}
        />
      )}
      {editing && (
        <AddLinkModal
          collections={data.collections.filter((c) => !(c.isSharedImport && c.importedRole === 'viewer'))}
          defaultCollectionId={editing.collectionId}
          editing={editing}
          onClose={() => setEditing(undefined)}
          onSaved={show}
        />
      )}
      <Toast msg={msg} action={action} onDismiss={dismiss} />
    </div>
  );
}
