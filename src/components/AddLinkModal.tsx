import { useEffect, useState } from 'react';
import { Globe, Lock, Sparkles, Loader2 } from 'lucide-react';
import { useAppData } from './hooks';
import { canFetchPages, fetchMeta, hasPagePermission, requestPagePermission } from '../services/meta';
import { linkVisibility, type Collection, type LinkItem, type Visibility } from '../types/links';
import { Field, Modal, SelectField } from './ui';
import { addLink, canonicalUrl, normalizeUrl, updateLink } from '../services/storage';
import { readClipboard } from '../services/clipboard';

interface Props {
  collections: Collection[];
  defaultCollectionId: string;
  defaultSectionId?: string | null;
  editing?: LinkItem;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export function AddLinkModal({ collections, defaultCollectionId, defaultSectionId, editing, onClose, onSaved }: Props) {
  const [url, setUrl] = useState(editing?.url ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [tags, setTags] = useState(editing?.tags.join(', ') ?? '');
  const [cid, setCid] = useState(editing?.collectionId ?? defaultCollectionId);
  const [sid, setSid] = useState<string>(editing?.sectionId ?? defaultSectionId ?? '');
  const [vis, setVis] = useState<Visibility>(editing ? linkVisibility(editing) : 'public');
  const [error, setError] = useState('');
  const sections = collections.find((c) => c.id === cid)?.sections ?? [];
  const all = useAppData();
  const [fetching, setFetching] = useState(false);
  const [hint, setHint] = useState('');

  const parsedUrl = normalizeUrl(url);
  const dup =
    parsedUrl && all
      ? all.links.find((l) => !l.deletedAt && l.id !== editing?.id && canonicalUrl(l.url) === canonicalUrl(parsedUrl))
      : undefined;
  const dupWhere = dup ? all?.collections.find((c) => c.id === dup.collectionId)?.name : undefined;

  const autofill = async (silent = false) => {
    if (!parsedUrl) return;
    if (!(await hasPagePermission())) {
      if (silent || !(await requestPagePermission())) return;
    }
    setFetching(true);
    setHint('');
    const m = await fetchMeta(parsedUrl);
    setFetching(false);
    if (!m) return silent ? undefined : setHint("Couldn't read this page. You can type a title instead.");
    setTitle((t) => t || m.title || '');
    setDesc((d) => d || m.description || '');
  };

  // Once the user has granted access, fill in the title automatically after they paste a URL.
  useEffect(() => {
    if (editing || title || !parsedUrl || !canFetchPages()) return;
    const t = setTimeout(() => autofill(true), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedUrl]);

  // Offer the clipboard URL for new links.
  useEffect(() => {
    if (editing) return;
    readClipboard().then((t) => {
      if (t && /^(https?:\/\/|www\.)/i.test(t.trim()) && normalizeUrl(t)) setUrl(t.trim());
    });
  }, [editing]);

  const save = async () => {
    const parsed = normalizeUrl(url);
    if (!parsed) return setError('Enter a valid URL, for example https://example.com');
    const tagList = [...new Set(tags.split(',').map((t) => t.trim()).filter(Boolean))];
    const base = { title, description: desc, tags: tagList, collectionId: cid, sectionId: sid || null, visibility: vis };
    if (editing) {
      await updateLink(editing.id, { ...base, url: parsed, title: title || parsed });
      onSaved('Link updated');
    } else {
      await addLink({ url: parsed, ...base });
      onSaved('Link saved');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? 'Edit link' : 'Add link'}
      onClose={onClose}
      footer={
        <>
          <button className="btn-text" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>
      }
    >
      <div className="space-y-3 pt-2">
        <Field
          label="URL"
          autoFocus
          value={url}
          error={error}
          helper={dup ? `Already saved${dupWhere ? ` in "${dupWhere}"` : ''}. You can still add it again.` : undefined}
          onChange={(v) => { setUrl(v); setError(''); setHint(''); }}
          onEnter={save}
        />
        <Field label="Title (optional)" value={title} onChange={setTitle} helper={hint || undefined} />
        {canFetchPages() && parsedUrl && !title && (
          <button type="button" className="btn-text !h-9 -mt-2" onClick={() => autofill(false)} disabled={fetching}>
            {fetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {fetching ? 'Reading page…' : 'Fill title from page'}
          </button>
        )}
        <Field label="Note (optional)" value={desc} onChange={setDesc} />
        <Field label="Tags" helper="Separate tags with commas" value={tags} onChange={setTags} />
        <SelectField label="Collection" value={cid} onChange={(v) => { setCid(v); setSid(''); }}>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </SelectField>
        {sections.length > 0 && (
          <SelectField label="Section" value={sid} onChange={setSid}>
            <option value="">No section</option>
            {sections.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </SelectField>
        )}
        <div>
          <div className="flex gap-2" role="radiogroup" aria-label="Visibility">
            {(['private', 'public'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={vis === v}
                onClick={() => setVis(v)}
                className={`chip flex-1 justify-center !h-8 ${vis === v ? 'chip-active' : ''}`}
              >
                {v === 'private' ? <Lock size={14} /> : <Globe size={14} />}
                {v === 'private' ? 'Private' : 'Public'}
              </button>
            ))}
          </div>
          <p className="text-xs text-g-sub mt-2 px-1">
            {vis === 'private'
              ? 'Private links stay on your devices and are left out of shared collections.'
              : 'Public links are included when you share this collection.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
