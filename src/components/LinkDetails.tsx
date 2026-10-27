import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, ShieldCheck, Globe, Image as ImageIcon, Loader2, Lock, X } from 'lucide-react';
import { linkVisibility, type Collection, type LinkItem, type Visibility } from '../types/links';
import { Favicon, SelectField } from './ui';
import { setLinkStatuses, updateLink } from '../services/storage';
import { canFetchPages, checkLink, fetchMeta, hasPagePermission, requestPagePermission } from '../services/meta';
import { openLink } from '../services/nav';
import { useT } from '../services/i18n';

const fmt = (t?: number) =>
  t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-';

/** Right-hand details drawer. Edits are saved as you leave each field. */
export function LinkDetails({
  link,
  collections,
  readOnly,
  onClose,
}: {
  link: LinkItem;
  collections: Collection[];
  readOnly?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(link.title);
  const [note, setNote] = useState(link.description ?? '');
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState<string | undefined>();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewMsg, setPreviewMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  // Reset local fields when switching to another link.
  useEffect(() => {
    setTitle(link.title);
    setNote(link.description ?? '');
    setTagInput('');
    setPreview(undefined);
    setPreviewMsg('');
    setCheckMsg('');
  }, [link.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const col = collections.find((c) => c.id === link.collectionId);
  const sections = col?.sections ?? [];
  const vis = linkVisibility(link);

  const addTags = () => {
    const add = tagInput.split(',').map((t) => t.trim()).filter((t) => t && !link.tags.includes(t));
    setTagInput('');
    if (add.length) updateLink(link.id, { tags: [...link.tags, ...add] });
  };

  const checkNow = async () => {
    setCheckMsg('');
    if (!navigator.onLine) return setCheckMsg('You appear to be offline.');
    if (!(await hasPagePermission()) && !(await requestPagePermission())) return setCheckMsg('Permission is needed to check links.');
    setChecking(true);
    const r = await checkLink(link.url);
    if (r.status === 'broken' && r.code === undefined) {
      setChecking(false);
      return setCheckMsg("Couldn't reach this site. It may be down, or you may be offline.");
    }
    await setLinkStatuses([{ id: link.id, ...r }]);
    setChecking(false);
  };

  const loadPreview = async () => {
    setPreviewMsg('');
    if (!(await hasPagePermission()) && !(await requestPagePermission())) return setPreviewMsg('Permission is needed to load a preview.');
    setLoadingPreview(true);
    const m = await fetchMeta(link.url);
    setLoadingPreview(false);
    if (m?.image) setPreview(m.image);
    else setPreviewMsg('This page has no preview image.');
  };

  return (
    <aside
      className="w-80 shrink-0 bg-g-bg rounded-2xl mr-4 mb-4 overflow-auto flex flex-col"
      aria-label="Link details"
    >
      <div className="flex items-center gap-2 pl-4 pr-2 h-12 shrink-0">
        <Favicon src={link.favicon} size={18} />
        <h2 className="flex-1 truncate text-[15px] font-medium">{t('details.title')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('details.close')}>
          <X size={16} />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Preview */}
        <div className="rounded-xl bg-g-surface overflow-hidden grid place-items-center h-36">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" onError={() => setPreview(undefined)} />
          ) : canFetchPages() ? (
            <button className="btn-text" onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {loadingPreview ? t('details.loading') : t('details.loadPreview')}
            </button>
          ) : (
            <Favicon src={link.favicon} size={40} />
          )}
        </div>
        {previewMsg && <p className="text-xs text-g-sub -mt-2">{previewMsg}</p>}

        <div>
          <label htmlFor="d-title" className="block text-xs text-g-sub mb-1">{t('details.name')}</label>
          <input
            id="d-title"
            className="input"
            value={title}
            disabled={readOnly}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== link.title && updateLink(link.id, { title: title.trim() })}
          />
        </div>

        <div>
          <span className="block text-xs text-g-sub mb-1">{t('details.address')}</span>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => openLink(e, link.url)}
            className="flex items-start gap-1.5 text-g-blue break-all hover:underline"
          >
            <ExternalLink size={14} className="mt-0.5 shrink-0" />
            {link.url}
          </a>
        </div>

        <div>
          <label htmlFor="d-note" className="block text-xs text-g-sub mb-1">{t('details.note')}</label>
          <textarea
            id="d-note"
            rows={4}
            className="w-full rounded-md border border-g-border bg-transparent px-3 py-2 text-[13px] hover:border-g-text/70 focus:outline-none focus:border-g-blue focus:ring-1 focus:ring-g-blue resize-y"
            placeholder={t('details.addNote')}
            value={note}
            disabled={readOnly}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (link.description ?? '') && updateLink(link.id, { description: note })}
          />
        </div>

        <div>
          <span className="block text-xs text-g-sub mb-1">{t('link.tags')}</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {link.tags.length === 0 && <span className="text-xs text-g-sub">{t('details.noTags')}</span>}
            {link.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-g-surface border border-g-border/70 pl-2 pr-1 h-6 text-xs">
                {t}
                {!readOnly && (
                  <button
                    className="rounded-full hover:bg-g-text/10 w-4 h-4 grid place-items-center"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => updateLink(link.id, { tags: link.tags.filter((x) => x !== t) })}
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {!readOnly && (
            <input
              className="input"
              aria-label="Add tags"
              placeholder={t('details.addTag')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTags())}
              onBlur={addTags}
            />
          )}
        </div>

        {!readOnly && (
          <>
            <SelectField
              label={t('link.collection')}
              value={link.collectionId}
              onChange={(v) => updateLink(link.id, { collectionId: v, sectionId: null })}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>
            {sections.length > 0 && (
              <SelectField
                label={t('link.section')}
                value={link.sectionId ?? ''}
                onChange={(v) => updateLink(link.id, { sectionId: v || null })}
              >
                <option value="">{t('link.noSection')}</option>
                {sections.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </SelectField>
            )}
            <div className="flex gap-2" role="radiogroup" aria-label="Visibility">
              {(['private', 'public'] as Visibility[]).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={vis === v}
                  className={`chip flex-1 justify-center !h-8 ${vis === v ? 'chip-active' : ''}`}
                  onClick={() => updateLink(link.id, { visibility: v })}
                >
                  {v === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                  {v === 'private' ? t('common.private') : t('common.public')}
                </button>
              ))}
            </div>
          </>
        )}

        <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-g-sub pt-1">
          <dt>{t('details.added')}</dt><dd className="text-g-text">{fmt(link.createdAt)}</dd>
          <dt>{t('details.edited')}</dt><dd className="text-g-text">{fmt(link.updatedAt)}</dd>
          <dt>{t('details.status')}</dt>
          <dd className="text-g-text flex items-center gap-1">
            {link.linkStatus === 'broken' ? (
              <><AlertTriangle size={12} className="text-g-red" /> {t('details.broken')}{link.statusCode ? ` (HTTP ${link.statusCode})` : ''}, checked {fmt(link.checkedAt)}</>
            ) : link.linkStatus === 'ok' ? (
              <>{t('details.working')}{link.statusCode ? ` (HTTP ${link.statusCode})` : ''}, checked {fmt(link.checkedAt)}</>
            ) : (
              t('details.notChecked')
            )}
          </dd>
        </dl>

        {canFetchPages() && (
          <div className="space-y-2">
            <button className="btn-outline w-full" onClick={checkNow} disabled={checking}>
              {checking ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {checking ? t('details.checking') : t('details.checkNow')}
            </button>
            {checkMsg && <p className="text-xs text-g-sub" role="status">{checkMsg}</p>}
            {link.finalUrl && !readOnly && (
              <div className="rounded-xl bg-g-surface p-3 text-xs">
                <p className="text-g-sub mb-1">{t('details.redirects')}</p>
                <p className="break-all mb-2">{link.finalUrl}</p>
                <button
                  className="btn-tonal !h-7 !px-3"
                  onClick={() => updateLink(link.id, { url: link.finalUrl!, finalUrl: undefined, linkStatus: 'ok' })}
                >
                  {t('details.updateLink')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
