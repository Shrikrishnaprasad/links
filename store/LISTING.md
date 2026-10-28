# Chrome Web Store listing

## Name
LinkVault - Link Manager

## Summary (max 132 characters)
Save, organise and share links in collections and sections, with tags, search, private links and one-click copy.

## Category
Productivity

## Detailed description
LinkVault is a fast, tidy home for every link you want to keep.

SAVE IN ONE CLICK
- Save the current tab from the toolbar popup, the Ctrl+Shift+S shortcut, or the right-click menu.
- Paste a URL and LinkVault can fill in the title for you.

ORGANISE YOUR WAY
- Collections, with optional sections inside each one.
- Tags, pinned favourites, search, list and grid views.
- Drag and drop links between collections and sections, or arrange them manually.
- Duplicate finder and a broken-link checker keep your library clean.
- Undo for deletes and moves.

PUBLIC OR PRIVATE
- Mark collections and individual links as private or public.
- Private links never appear in anything you share.

SHARE
- Create a share link for a public collection, with Viewer or Editor access, and copy it as a link, plain URLs or Markdown.

YOUR DATA, YOUR CONTROL
- Everything is stored in your browser and synced through your own browser account. There is no LinkVault server and no account to create.
- Import browser bookmarks, or export a JSON/CSV backup at any time.
- Light and dark themes follow your system.

## Single purpose
Save, organise and share links (URLs).

## Permission justifications
- storage: stores your links and collections, and syncs them through your browser account.
- activeTab: reads the title and address of the tab you choose to save, only when you click Save or use the shortcut.
- contextMenus: adds "Save link to LinkVault" and "Save page to LinkVault" to the right-click menu.
- clipboardRead: the "Paste link" button reads a URL from the clipboard when you click it.
- clipboardWrite: copies links, share links and URL lists when you click Copy.
- alarms: runs the optional daily link check in the background (off unless you turn on Link health).
- Optional access to all websites (requested only if you click "Fill title from page" or "Check links"): downloads the title of a page you are saving and checks whether your saved links still load. No page content is stored or sent anywhere.

## Store graphics (ready to upload)

Generated PNGs live in **`store/graphics/`** (regenerate: `node scripts/generate-store-graphics.mjs`).

| File | Size | Use in dashboard |
|------|------|------------------|
| `screenshot-01-dashboard-1280x800.png` | 1280×800 | Screenshot |
| `screenshot-02-popup-1280x800.png` | 1280×800 | Screenshot |
| `screenshot-03-share-1280x800.png` | 1280×800 | Screenshot |
| `screenshot-04-grid-dark-1280x800.png` | 1280×800 | Screenshot |
| `screenshot-05-features-1280x800.png` | 1280×800 | Screenshot |
| `promo-tile-440x280.png` | 440×280 | Small promo tile |
| `marquee-1400x560.png` | 1400×560 | Marquee (optional) |

Upload **at least one** screenshot (1280×800). Add up to 5 for a stronger listing.

## Assets
- Icon 128x128: `public/icons/icon-128.png` (already in the extension package).
