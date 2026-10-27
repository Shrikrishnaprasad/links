import type { HTMLAttributes } from 'react';
import { Copy, ExternalLink, Pin, Trash2, RotateCcw, Pencil, Lock, Globe, AlertTriangle, Star, CopyPlus, Info } from 'lucide-react';
import { linkVisibility, type LinkItem } from '../types/links';
import { Favicon } from './ui';
import { openLink } from '../services/nav';

interface Props {
  link: LinkItem;
  variant?: 'row' | 'grid' | 'compact';
  collectionName?: string;
  selected?: boolean;
  readOnly?: boolean;
  onSelect?: (checked: boolean) => void;
  onCopy: () => void;
  onPin?: () => void;
  onFavorite?: () => void;
  onDuplicate?: () => void;
  onDetails?: () => void;
  onEdit?: () => void;
  onToggleVisibility?: () => void;
  /** Drag-and-drop handlers (spread on the card root). */
  drag?: HTMLAttributes<HTMLDivElement>;
  dropActive?: boolean;
  onTrash?: () => void;
  onRestore?: () => void;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const formatDate = (t: number) => {
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
};

export function LinkCard(p: Props) {
  const { link, variant = 'row', selected, readOnly } = p;
  const host = hostOf(link.url);
  const isPrivate = linkVisibility(link) === 'private';

  const actions = (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      {p.onDetails && !p.onRestore && (
        <button className="icon-btn-sm" onClick={p.onDetails} title="Details" aria-label="Details">
          <Info size={16} />
        </button>
      )}
      {p.onRestore ? (
        <button className="icon-btn-sm" onClick={p.onRestore} title="Restore" aria-label="Restore">
          <RotateCcw size={16} />
        </button>
      ) : (
        <>
          <button className="icon-btn-sm" onClick={p.onCopy} title="Copy link" aria-label="Copy link">
            <Copy size={16} />
          </button>
          <a className="icon-btn-sm" href={link.url} onClick={(e) => openLink(e, link.url)} target="_blank" rel="noreferrer" title="Open in new tab" aria-label="Open">
            <ExternalLink size={16} />
          </a>
          {!readOnly && p.onFavorite && (
            <button className="icon-btn-sm" onClick={p.onFavorite} title={link.isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-label="Favorite" aria-pressed={!!link.isFavorite}>
              <Star size={16} className={link.isFavorite ? 'fill-g-yellow text-g-yellow' : ''} />
            </button>
          )}
          {!readOnly && p.onPin && (
            <button className="icon-btn-sm" onClick={p.onPin} title={link.isPinned ? 'Unpin' : 'Pin'} aria-label="Pin">
              <Pin size={16} className={link.isPinned ? 'fill-g-blue text-g-blue' : ''} />
            </button>
          )}
          {!readOnly && p.onToggleVisibility && (
            <button
              className="icon-btn-sm"
              onClick={p.onToggleVisibility}
              title={isPrivate ? 'Private - click to make public' : 'Public - click to make private'}
              aria-label="Toggle visibility"
            >
              {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
            </button>
          )}
          {!readOnly && p.onEdit && (
            <button className="icon-btn-sm" onClick={p.onEdit} title="Edit" aria-label="Edit">
              <Pencil size={16} />
            </button>
          )}
          {!readOnly && p.onDuplicate && (
            <button className="icon-btn-sm" onClick={p.onDuplicate} title="Duplicate" aria-label="Duplicate">
              <CopyPlus size={16} />
            </button>
          )}
        </>
      )}
      {!readOnly && p.onTrash && (
        <button className="icon-btn-sm" onClick={p.onTrash} title="Move to trash" aria-label="Move to trash">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  if (variant === 'grid') {
    return (
      <div
        {...p.drag}
        className={`group relative rounded-xl border overflow-hidden transition-shadow hover:shadow-g1 [content-visibility:auto] [contain-intrinsic-size:auto_170px] ${
          selected ? 'bg-g-nav border-g-nav' : 'bg-g-surface border-transparent'
        } ${p.dropActive ? 'ring-2 ring-g-blue' : ''}`}
      >
        <a href={link.url} onClick={(e) => openLink(e, link.url)} target="_blank" rel="noreferrer" className="block">
          <div className="h-24 grid place-items-center bg-g-bg m-2 mb-0 rounded-lg border border-g-border/50">
            <Favicon src={link.favicon} size={40} />
          </div>
          <div className="px-3 pt-3 pb-1 flex items-center gap-2">
            <Favicon src={link.favicon} size={16} />
            <span className="truncate text-sm font-medium flex-1">{link.title}</span>
            {isPrivate && <Lock size={12} className="text-g-sub shrink-0" aria-label="Private" />}
            {link.linkStatus === 'broken' && <AlertTriangle size={12} className="text-g-red shrink-0" aria-label="Link may be broken" />}
          </div>
          <div className="px-3 pb-3 text-xs text-g-sub truncate">{host}</div>
        </a>
        {p.onSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => p.onSelect!(e.target.checked)}
            aria-label={`Select ${link.title}`}
            className={`absolute top-3 left-3 w-4 h-4 accent-g-blue ${selected ? '' : 'opacity-0 group-hover:opacity-100'}`}
          />
        )}
        <div className="absolute top-1 right-1 bg-g-bg/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div {...p.drag} className="group flex items-center gap-3 pl-3 pr-2 h-10 hover:bg-g-hover">
        <Favicon src={link.favicon} size={18} />
        <a href={link.url} onClick={(e) => openLink(e, link.url)} target="_blank" rel="noreferrer" className="min-w-0 flex-1" title={link.url}>
          <div className="truncate text-sm">{link.title}</div>
          <div className="truncate text-xs text-g-sub leading-none">{host}</div>
        </a>
        {link.isPinned && <Pin size={12} className="fill-g-blue text-g-blue group-hover:hidden" />}
        <div className="hidden group-hover:flex">{actions}</div>
      </div>
    );
  }

  // Drive-style list row: Name | Collection | Tags | Added
  return (
    <div
      {...p.drag}
      className={`group grid grid-cols-[28px_minmax(0,3fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_88px_276px] items-center gap-3 px-4 h-12 border-b border-g-border/60 ${
        selected ? 'bg-g-nav' : 'hover:bg-g-hover'
      } ${p.dropActive ? 'shadow-[inset_0_2px_0_0_rgb(var(--g-blue))]' : ''}`}
    >
      {p.onSelect ? (
        <input
          type="checkbox"
          className="w-4 h-4 accent-g-blue"
          checked={!!selected}
          onChange={(e) => p.onSelect!(e.target.checked)}
          aria-label={`Select ${link.title}`}
        />
      ) : (
        <span />
      )}
      <a href={link.url} onClick={(e) => openLink(e, link.url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0" title={link.url}>
        <Favicon src={link.favicon} size={20} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-g-text">{link.title}</div>
          <div className="truncate text-xs text-g-sub">{host}</div>
        </div>
        {isPrivate && <Lock size={12} className="text-g-sub shrink-0" aria-label="Private" />}
        {link.linkStatus === 'broken' && <AlertTriangle size={12} className="text-g-red shrink-0" aria-label="Link may be broken" />}
        {link.isFavorite && <Star size={12} className="fill-g-yellow text-g-yellow shrink-0" aria-label="Favorite" />}
        {link.isPinned && <Pin size={12} className="fill-g-blue text-g-blue shrink-0" />}
      </a>
      <span className="truncate text-sm text-g-sub">{p.collectionName}</span>
      <div className="flex gap-1 overflow-hidden">
        {link.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-g-surface border border-g-border/70 text-g-sub truncate">
            {t}
          </span>
        ))}
      </div>
      <span className="text-sm text-g-sub">{formatDate(link.createdAt)}</span>
      <div className="flex justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">{actions}</div>
    </div>
  );
}
