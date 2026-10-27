export type AccessRole = 'viewer' | 'editor';
export type Visibility = 'private' | 'public';
export type GeneralAccess = 'restricted' | 'anyone_with_link';

export interface Collaborator {
  email: string;
  role: AccessRole;
}

export interface ShareSettings {
  generalAccess: GeneralAccess;
  generalRole: AccessRole;
  collaborators: Collaborator[];
  shareToken?: string;
  updatedAt: number;
}

export interface Section {
  id: string;
  name: string;
  collapsed?: boolean;
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  collectionId: string;
  sectionId?: string | null;
  /** Missing = 'public' (back-compat). Private links are never included in shares. */
  visibility?: Visibility;
  tags: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  deletedAt?: number | null;
  /** Manual sort position (used by drag-and-drop reorder). */
  order?: number;
  /** Result of the last broken-link check. */
  linkStatus?: 'ok' | 'broken';
  checkedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  /** Missing = 'private'. Private collections cannot be shared. */
  visibility?: Visibility;
  sections?: Section[];
  shareSettings: ShareSettings;
  isSharedImport?: boolean;
  importedRole?: AccessRole;
  createdAt: number;
  updatedAt: number;
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'local-only';
  lastSyncedAt?: number;
  message?: string;
}

export interface AppData {
  links: LinkItem[];
  collections: Collection[];
}

export const DEFAULT_COLLECTION_ID = 'inbox';

export const linkVisibility = (l: LinkItem): Visibility => l.visibility ?? 'public';
export const collectionVisibility = (c: Collection): Visibility => c.visibility ?? 'private';
