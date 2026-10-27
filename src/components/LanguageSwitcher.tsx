import { Languages } from 'lucide-react';
import { LANGUAGES, setLang, useLang, useT, type Lang } from '../services/i18n';

export function LanguageSwitcher() {
  const lang = useLang();
  const t = useT();
  return (
    <label className="relative inline-flex items-center" title={t('language')}>
      <Languages size={16} className="pointer-events-none absolute left-2 text-g-sub" aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select
        className="select-inline !pl-7 cursor-pointer"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </select>
    </label>
  );
}
