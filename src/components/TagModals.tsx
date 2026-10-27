import { useMemo, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { LinkItem } from '../types/links';
import { Field, Modal } from './ui';
import { deleteTag, editTags, renameTag } from '../services/storage';
import { useT } from '../services/i18n';

const parseTags = (s: string) => [...new Set(s.split(',').map((t) => t.trim()).filter(Boolean))];

/** Add and/or remove tags on many links at once. */
export function BulkTagsModal({
  links,
  onClose,
  onDone,
}: {
  links: LinkItem[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const t = useT();
  const [add, setAdd] = useState('');
  const [remove, setRemove] = useState<Set<string>>(new Set());
  const present = useMemo(() => {
    const m = new Map<string, number>();
    links.forEach((l) => l.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [links]);

  const toAdd = parseTags(add);
  const apply = async () => {
    if (!toAdd.length && !remove.size) return onClose();
    await editTags(links.map((l) => l.id), toAdd, [...remove]);
    const parts = [toAdd.length && `added ${toAdd.length}`, remove.size && `removed ${remove.size}`].filter(Boolean);
    onDone(`Tags updated: ${parts.join(', ')} on ${links.length} link${links.length > 1 ? 's' : ''}`);
    onClose();
  };

  return (
    <Modal
      title={t('tags.editFor', { n: links.length })}
      onClose={onClose}
      footer={
        <>
          <button className="btn-text" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={apply}>{t('common.apply')}</button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        <Field label={t('tags.addTags')} helper={t('link.tagsHelp')} autoFocus value={add} onChange={setAdd} onEnter={apply} />
        {present.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-g-sub mb-2">{t('tags.onThese')}</h3>
            <div className="flex flex-wrap gap-2">
              {present.map(([t, n]) => {
                const on = remove.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    className={`chip ${on ? 'chip-active !line-through' : ''}`}
                    onClick={() =>
                      setRemove((p) => {
                        const x = new Set(p);
                        on ? x.delete(t) : x.add(t);
                        return x;
                      })
                    }
                  >
                    {on && <Check size={12} />}
                    {t} <span className="text-g-sub">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Rename, merge or delete tags across the whole library. */
export function ManageTagsModal({
  tags,
  onClose,
  onDone,
}: {
  tags: Array<[string, number]>;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const t = useT();
  const [names, setNames] = useState<Record<string, string>>({});
  const existing = new Set(tags.map(([t]) => t));

  const commit = async (from: string) => {
    const to = (names[from] ?? from).trim();
    if (!to || to === from) return setNames((p) => ({ ...p, [from]: from }));
    const merging = existing.has(to);
    await renameTag(from, to);
    onDone(merging ? `Merged "${from}" into "${to}"` : `Renamed "${from}" to "${to}"`);
  };

  return (
    <Modal
      title={t('tags.manage')}
      onClose={onClose}
      footer={<button className="btn-primary" onClick={onClose}>{t('common.done')}</button>}
    >
      {tags.length === 0 ? (
        <p className="text-g-sub py-4">{t('tags.none')}</p>
      ) : (
        <>
          <p className="text-xs text-g-sub mb-3">{t('tags.manageHelp')}</p>
          <ul className="space-y-1">
            {tags.map(([t, n]) => (
              <li key={t} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  aria-label={`Rename tag ${t}`}
                  value={names[t] ?? t}
                  onChange={(e) => setNames((p) => ({ ...p, [t]: e.target.value }))}
                  onBlur={() => commit(t)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                />
                <span className="text-xs text-g-sub w-14 text-right">{n} link{n > 1 ? 's' : ''}</span>
                <button
                  className="icon-btn-sm"
                  aria-label={`Delete tag ${t}`}
                  title="Delete tag"
                  onClick={async () => {
                    if (confirm(`Remove the tag "${t}" from ${n} link${n > 1 ? 's' : ''}? The links are kept.`)) {
                      await deleteTag(t);
                      onDone(`Deleted tag "${t}"`);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
