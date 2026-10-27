import { useCallback, useSyncExternalStore } from 'react';
import { ar, bn, it, ja, pt, ru, ta, te, zh } from './i18n-extra';
import { deMore, enMore, esMore, frMore, hiMore } from './i18n-more';

export type Lang = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ru' | 'ja' | 'zh' | 'ar';
export const LANGUAGES: Array<{ code: Lang; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
];

const enBase = {
  'nav.all': 'All links',
  'nav.pinned': 'Pinned',
  'nav.favorites': 'Favorites',
  'nav.shared': 'Shared with me',
  'nav.duplicates': 'Duplicates',
  'nav.broken': 'Broken links',
  'nav.trash': 'Trash',
  'nav.collections': 'Collections',
  'nav.sharedGroup': 'Shared',
  'nav.tags': 'Tags',
  'nav.label': 'Main navigation',
  'action.newLink': 'New link',
  'action.openShare': 'Open share link',
  'action.importExport': 'Import / export',
  'search.placeholder': 'Search links, tags, notes',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.create': 'Create',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.move': 'Move',
  'common.trash': 'Trash',
  'common.rename': 'Rename',
  'common.duplicate': 'Duplicate',
  'common.delete': 'Delete',
  'common.share': 'Share',
  'common.private': 'Private',
  'common.public': 'Public',
  'toolbar.newSection': 'New section',
  'toolbar.checkLinks': 'Check links',
  'toolbar.emptyTrash': 'Empty trash',
  'sort.recent': 'Recently added',
  'sort.name': 'Name A–Z',
  'sort.manual': 'Manual order',
  'col.name': 'Name',
  'col.collection': 'Collection',
  'col.tags': 'Tags',
  'col.added': 'Added',
  'empty.noLinks': 'No links here yet',
  'empty.noLinksBody': 'Paste a URL or save the current tab to get started.',
  'empty.noMatches': 'No matching links',
  'empty.trash': 'Trash is empty',
  'empty.pinned': 'Nothing pinned yet',
  'empty.favorites': 'No favorites yet',
  'popup.saveTab': 'Save tab',
  'popup.paste': 'Paste link',
  'popup.search': 'Search links',
  'popup.all': 'All',
  'dialog.addLink': 'Add link',
  'dialog.editLink': 'Edit link',
  skip: 'Skip to links',
  language: 'Language',
} as const;
const en = { ...enBase, ...enMore } as const;

export type Key = keyof typeof en;
type Dict = Partial<Record<Key, string>>;

const hi: Dict = {
  'nav.all': 'सभी लिंक', 'nav.pinned': 'पिन किए गए', 'nav.favorites': 'पसंदीदा', 'nav.shared': 'मेरे साथ साझा',
  'nav.duplicates': 'डुप्लिकेट', 'nav.broken': 'टूटे लिंक', 'nav.trash': 'ट्रैश', 'nav.collections': 'संग्रह',
  'nav.sharedGroup': 'साझा', 'nav.tags': 'टैग', 'nav.label': 'मुख्य नेविगेशन',
  'action.newLink': 'नया लिंक', 'action.openShare': 'साझा लिंक खोलें', 'action.importExport': 'आयात / निर्यात',
  'search.placeholder': 'लिंक, टैग, नोट खोजें',
  'common.cancel': 'रद्द करें', 'common.save': 'सहेजें', 'common.create': 'बनाएं', 'common.done': 'हो गया', 'common.close': 'बंद करें',
  'common.copy': 'कॉपी', 'common.move': 'ले जाएं', 'common.trash': 'ट्रैश', 'common.rename': 'नाम बदलें', 'common.duplicate': 'डुप्लिकेट',
  'common.delete': 'हटाएं', 'common.share': 'साझा करें', 'common.private': 'निजी', 'common.public': 'सार्वजनिक',
  'toolbar.newSection': 'नया अनुभाग', 'toolbar.checkLinks': 'लिंक जांचें', 'toolbar.emptyTrash': 'ट्रैश खाली करें',
  'sort.recent': 'हाल में जोड़े गए', 'sort.name': 'नाम A–Z', 'sort.manual': 'मैनुअल क्रम',
  'col.name': 'नाम', 'col.collection': 'संग्रह', 'col.tags': 'टैग', 'col.added': 'जोड़ा गया',
  'empty.noLinks': 'यहाँ अभी कोई लिंक नहीं', 'empty.noLinksBody': 'शुरू करने के लिए URL पेस्ट करें या मौजूदा टैब सहेजें।',
  'empty.noMatches': 'कोई मेल खाता लिंक नहीं', 'empty.trash': 'ट्रैश खाली है', 'empty.pinned': 'अभी कुछ पिन नहीं किया', 'empty.favorites': 'अभी कोई पसंदीदा नहीं',
  'popup.saveTab': 'टैब सहेजें', 'popup.paste': 'लिंक पेस्ट करें', 'popup.search': 'लिंक खोजें', 'popup.all': 'सभी',
  'dialog.addLink': 'लिंक जोड़ें', 'dialog.editLink': 'लिंक संपादित करें', skip: 'लिंक पर जाएं', language: 'भाषा',
};

const es: Dict = {
  'nav.all': 'Todos los enlaces', 'nav.pinned': 'Fijados', 'nav.favorites': 'Favoritos', 'nav.shared': 'Compartidos conmigo',
  'nav.duplicates': 'Duplicados', 'nav.broken': 'Enlaces rotos', 'nav.trash': 'Papelera', 'nav.collections': 'Colecciones',
  'nav.sharedGroup': 'Compartidas', 'nav.tags': 'Etiquetas', 'nav.label': 'Navegación principal',
  'action.newLink': 'Nuevo enlace', 'action.openShare': 'Abrir enlace compartido', 'action.importExport': 'Importar / exportar',
  'search.placeholder': 'Buscar enlaces, etiquetas, notas',
  'common.cancel': 'Cancelar', 'common.save': 'Guardar', 'common.create': 'Crear', 'common.done': 'Listo', 'common.close': 'Cerrar',
  'common.copy': 'Copiar', 'common.move': 'Mover', 'common.trash': 'Papelera', 'common.rename': 'Renombrar', 'common.duplicate': 'Duplicar',
  'common.delete': 'Eliminar', 'common.share': 'Compartir', 'common.private': 'Privado', 'common.public': 'Público',
  'toolbar.newSection': 'Nueva sección', 'toolbar.checkLinks': 'Comprobar enlaces', 'toolbar.emptyTrash': 'Vaciar papelera',
  'sort.recent': 'Añadidos recientemente', 'sort.name': 'Nombre A–Z', 'sort.manual': 'Orden manual',
  'col.name': 'Nombre', 'col.collection': 'Colección', 'col.tags': 'Etiquetas', 'col.added': 'Añadido',
  'empty.noLinks': 'Aún no hay enlaces', 'empty.noLinksBody': 'Pega una URL o guarda la pestaña actual para empezar.',
  'empty.noMatches': 'No hay enlaces que coincidan', 'empty.trash': 'La papelera está vacía', 'empty.pinned': 'Nada fijado todavía', 'empty.favorites': 'Aún no hay favoritos',
  'popup.saveTab': 'Guardar pestaña', 'popup.paste': 'Pegar enlace', 'popup.search': 'Buscar enlaces', 'popup.all': 'Todos',
  'dialog.addLink': 'Añadir enlace', 'dialog.editLink': 'Editar enlace', skip: 'Ir a los enlaces', language: 'Idioma',
};

const fr: Dict = {
  'nav.all': 'Tous les liens', 'nav.pinned': 'Épinglés', 'nav.favorites': 'Favoris', 'nav.shared': 'Partagés avec moi',
  'nav.duplicates': 'Doublons', 'nav.broken': 'Liens cassés', 'nav.trash': 'Corbeille', 'nav.collections': 'Collections',
  'nav.sharedGroup': 'Partagées', 'nav.tags': 'Tags', 'nav.label': 'Navigation principale',
  'action.newLink': 'Nouveau lien', 'action.openShare': 'Ouvrir un lien partagé', 'action.importExport': 'Importer / exporter',
  'search.placeholder': 'Rechercher des liens, tags, notes',
  'common.cancel': 'Annuler', 'common.save': 'Enregistrer', 'common.create': 'Créer', 'common.done': 'Terminé', 'common.close': 'Fermer',
  'common.copy': 'Copier', 'common.move': 'Déplacer', 'common.trash': 'Corbeille', 'common.rename': 'Renommer', 'common.duplicate': 'Dupliquer',
  'common.delete': 'Supprimer', 'common.share': 'Partager', 'common.private': 'Privé', 'common.public': 'Public',
  'toolbar.newSection': 'Nouvelle section', 'toolbar.checkLinks': 'Vérifier les liens', 'toolbar.emptyTrash': 'Vider la corbeille',
  'sort.recent': 'Ajoutés récemment', 'sort.name': 'Nom A–Z', 'sort.manual': 'Ordre manuel',
  'col.name': 'Nom', 'col.collection': 'Collection', 'col.tags': 'Tags', 'col.added': 'Ajouté',
  'empty.noLinks': 'Aucun lien pour le moment', 'empty.noLinksBody': "Collez une URL ou enregistrez l'onglet actuel pour commencer.",
  'empty.noMatches': 'Aucun lien correspondant', 'empty.trash': 'La corbeille est vide', 'empty.pinned': 'Rien d’épinglé', 'empty.favorites': 'Aucun favori',
  'popup.saveTab': "Enregistrer l'onglet", 'popup.paste': 'Coller un lien', 'popup.search': 'Rechercher des liens', 'popup.all': 'Tous',
  'dialog.addLink': 'Ajouter un lien', 'dialog.editLink': 'Modifier le lien', skip: 'Aller aux liens', language: 'Langue',
};

const de: Dict = {
  'nav.all': 'Alle Links', 'nav.pinned': 'Angeheftet', 'nav.favorites': 'Favoriten', 'nav.shared': 'Mit mir geteilt',
  'nav.duplicates': 'Duplikate', 'nav.broken': 'Defekte Links', 'nav.trash': 'Papierkorb', 'nav.collections': 'Sammlungen',
  'nav.sharedGroup': 'Geteilt', 'nav.tags': 'Tags', 'nav.label': 'Hauptnavigation',
  'action.newLink': 'Neuer Link', 'action.openShare': 'Freigabelink öffnen', 'action.importExport': 'Import / Export',
  'search.placeholder': 'Links, Tags, Notizen suchen',
  'common.cancel': 'Abbrechen', 'common.save': 'Speichern', 'common.create': 'Erstellen', 'common.done': 'Fertig', 'common.close': 'Schließen',
  'common.copy': 'Kopieren', 'common.move': 'Verschieben', 'common.trash': 'Papierkorb', 'common.rename': 'Umbenennen', 'common.duplicate': 'Duplizieren',
  'common.delete': 'Löschen', 'common.share': 'Teilen', 'common.private': 'Privat', 'common.public': 'Öffentlich',
  'toolbar.newSection': 'Neuer Abschnitt', 'toolbar.checkLinks': 'Links prüfen', 'toolbar.emptyTrash': 'Papierkorb leeren',
  'sort.recent': 'Zuletzt hinzugefügt', 'sort.name': 'Name A–Z', 'sort.manual': 'Manuelle Reihenfolge',
  'col.name': 'Name', 'col.collection': 'Sammlung', 'col.tags': 'Tags', 'col.added': 'Hinzugefügt',
  'empty.noLinks': 'Noch keine Links', 'empty.noLinksBody': 'Füge eine URL ein oder speichere den aktuellen Tab, um zu starten.',
  'empty.noMatches': 'Keine passenden Links', 'empty.trash': 'Der Papierkorb ist leer', 'empty.pinned': 'Noch nichts angeheftet', 'empty.favorites': 'Noch keine Favoriten',
  'popup.saveTab': 'Tab speichern', 'popup.paste': 'Link einfügen', 'popup.search': 'Links suchen', 'popup.all': 'Alle',
  'dialog.addLink': 'Link hinzufügen', 'dialog.editLink': 'Link bearbeiten', skip: 'Zu den Links springen', language: 'Sprache',
};

const DICTS: Record<Lang, Dict> = {
  en,
  hi: { ...hi, ...hiMore },
  es: { ...es, ...esMore },
  fr: { ...fr, ...frMore },
  de: { ...de, ...deMore },
  ta, te, bn, pt, it, ru, ja, zh, ar,
} as Record<Lang, Dict>;
const KEY = 'linkvault:lang';

function detect(): Lang {
  const saved = localStorage.getItem(KEY) as Lang | null;
  if (saved && saved in DICTS) return saved;
  const nav = (navigator.language || 'en').slice(0, 2) as Lang;
  return nav in DICTS ? nav : 'en';
}

let lang: Lang = detect();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function setLang(l: Lang) {
  lang = l;
  localStorage.setItem(KEY, l);
  applyLang();
  emit();
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    lang = detect();
    applyLang();
    emit();
  }
});

export const getLang = () => lang;

export function translate(l: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[l][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => lang,
  );
}

export function useT() {
  const l = useLang();
  return useCallback((key: Key, vars?: Record<string, string | number>) => translate(l, key, vars), [l]);
}
