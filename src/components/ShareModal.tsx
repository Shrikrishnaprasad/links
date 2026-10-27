import { useState } from 'react';
import { Globe, Link2, Lock, X } from 'lucide-react';
import { collectionVisibility, linkVisibility, type AccessRole, type Collection, type GeneralAccess, type LinkItem } from '../types/links';
import { Field, Modal, SelectField } from './ui';
import { updateCollection, uid } from '../services/storage';
import { buildShareLink, encodeShare, linksToText } from '../services/sharing';
import { copyText } from '../services/clipboard';

interface Props {
  collection: Collection;
  links: LinkItem[];
  onClose: () => void;
  onToast: (m: string) => void;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareModal({ collection, links: allLinks, onClose, onToast }: Props) {
  const s = collection.shareSettings;
  const isPrivate = collectionVisibility(collection) === 'private';
  const links = allLinks.filter((l) => linkVisibility(l) === 'public');
  const hiddenCount = allLinks.length - links.length;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessRole>('viewer');
  const [err, setErr] = useState('');

  const patch = (p: Partial<typeof s>) =>
    updateCollection(collection.id, { shareSettings: { ...s, ...p, updatedAt: Date.now() } });

  const addPerson = async () => {
    const e = email.trim().toLowerCase();
    if (!emailRe.test(e)) return setErr('Enter a valid email');
    if (s.collaborators.some((c) => c.email === e)) return setErr('Already added');
    await patch({ collaborators: [...s.collaborators, { email: e, role }] });
    setEmail('');
    setErr('');
  };

  const copyShare = async () => {
    // Role granted to the recipient: link role for "anyone", else the strongest collaborator role.
    const r: AccessRole = s.generalAccess === 'anyone_with_link' ? s.generalRole : 'viewer';
    const token = s.shareToken ?? uid();
    if (!s.shareToken) await patch({ shareToken: token });
    const link = buildShareLink(encodeShare(collection, links, r));
    await copyText(link);
    onToast('Share link copied');
  };

  return (
    <Modal
      title={`Share "${collection.name}"`}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-outline" onClick={copyShare} disabled={isPrivate}>
            <Link2 size={14} /> Copy link
          </button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </>
      }
    >
      {isPrivate && (
        <div className="mb-4 p-3 rounded-xl bg-g-surface flex items-center gap-3">
          <Lock size={16} className="text-g-sub shrink-0" />
          <p className="flex-1 text-sm">This collection is private, so it can't be shared. Make it public to share it.</p>
          <button className="btn-tonal !h-8 !px-3" onClick={() => updateCollection(collection.id, { visibility: 'public' })}>Make public</button>
        </div>
      )}
      {!isPrivate && hiddenCount > 0 && (
        <p className="mb-3 text-xs text-g-sub">{hiddenCount} private link{hiddenCount > 1 ? 's are' : ' is'} not included in shared copies.</p>
      )}
      <fieldset disabled={isPrivate} className={isPrivate ? 'opacity-50 pointer-events-none' : ''}>
      <div className="flex gap-2 items-start pt-2">
        <div className="flex-1">
          <Field
            label="Add people by email"
            type="email"
            value={email}
            error={err}
            onChange={(v) => {
              setEmail(v);
              setErr('');
            }}
            onEnter={addPerson}
          />
        </div>
        <div className="w-32">
          <SelectField label="Role" value={role} onChange={(v) => setRole(v as AccessRole)}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </SelectField>
        </div>
        <button className="btn-primary !h-11" onClick={addPerson}>Add</button>
      </div>

      <h3 className="text-sm font-medium mt-5 mb-2">People with access</h3>
      <ul className="space-y-1">
        <li className="flex items-center gap-3 py-1.5">
          <div className="w-8 h-8 rounded-full bg-g-blue text-g-onBlue grid place-items-center text-sm">Y</div>
          <div className="flex-1 text-sm">You <span className="text-g-sub">(owner)</span></div>
        </li>
        {s.collaborators.map((c) => (
          <li key={c.email} className="flex items-center gap-3 py-1.5">
            <div className="w-8 h-8 rounded-full bg-g-blueSoft text-g-blue grid place-items-center text-sm uppercase">
              {c.email[0]}
            </div>
            <div className="flex-1 text-sm truncate">{c.email}</div>
            <select
              className="select-inline"
              value={c.role}
              aria-label={`Role for ${c.email}`}
              onChange={(e) =>
                patch({
                  collaborators: s.collaborators.map((x) =>
                    x.email === c.email ? { ...x, role: e.target.value as AccessRole } : x,
                  ),
                })
              }
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              className="icon-btn"
              aria-label={`Remove ${c.email}`}
              onClick={() => patch({ collaborators: s.collaborators.filter((x) => x.email !== c.email) })}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <h3 className="text-sm font-medium mt-5 mb-2">General access</h3>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full grid place-items-center ${s.generalAccess === 'restricted' ? 'bg-g-hover text-g-sub' : 'bg-g-green/15 text-g-green'}`}>
          {s.generalAccess === 'restricted' ? <Lock size={14} /> : <Globe size={14} />}
        </div>
        <div className="flex-1">
          <select
            className="select-inline !pl-1 font-medium"
            value={s.generalAccess}
            aria-label="General access"
            onChange={(e) => patch({ generalAccess: e.target.value as GeneralAccess })}
          >
            <option value="restricted">Restricted</option>
            <option value="anyone_with_link">Anyone with the link</option>
          </select>
          <p className="text-xs text-g-sub">
            {s.generalAccess === 'restricted'
              ? 'Only people added above can open this collection'
              : 'Anyone who has the link can open this collection'}
          </p>
        </div>
        {s.generalAccess === 'anyone_with_link' && (
          <select
            className="select-inline"
            value={s.generalRole}
            aria-label="Link role"
            onChange={(e) => patch({ generalRole: e.target.value as AccessRole })}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          className="btn-text"
          onClick={async () => {
            await copyText(linksToText(links));
            onToast(`Copied ${links.length} URLs`);
          }}
        >
          Copy all URLs
        </button>
        <button
          className="btn-text"
          onClick={async () => {
            await copyText(linksToText(links, 'markdown'));
            onToast('Copied as Markdown');
          }}
        >
          Copy as Markdown
        </button>
      </div>
      </fieldset>
    </Modal>
  );
}
