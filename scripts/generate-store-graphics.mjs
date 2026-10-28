/**
 * Generates Chrome Web Store listing graphics (PNG).
 * Run: node scripts/generate-store-graphics.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'store', 'graphics');
const iconPath = path.join(root, 'public', 'icons', 'icon-128.png');

const C = {
  canvas: '#f9fbfd',
  white: '#ffffff',
  surface: '#f0f4f9',
  nav: '#d3e3fd',
  tonal: '#c2e7ff',
  blue: '#0b57d0',
  blueSoft: '#eaf1fb',
  text: '#1f1f1f',
  sub: '#444746',
  border: '#c4c7c5',
  darkCanvas: '#131314',
  darkSurface: '#282a2c',
  darkText: '#e3e3e3',
  darkSub: '#c4c7c5',
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function chromeBar(w) {
  return `
  <rect width="${w}" height="48" fill="${C.white}"/>
  <circle cx="24" cy="24" r="6" fill="#ea4335"/>
  <circle cx="44" cy="24" r="6" fill="#fbbc04"/>
  <circle cx="64" cy="24" r="6" fill="#34a853"/>
  <rect x="${w / 2 - 180}" y="14" width="360" height="20" rx="10" fill="${C.surface}"/>
  `;
}

function sidebar(w, h, y0, items, activeIdx = 1) {
  let y = y0 + 24;
  const rows = items
    .map((item, i) => {
      const active = i === activeIdx;
      const bg = active ? C.nav : 'transparent';
      const row = `
      <rect x="12" y="${y - 8}" width="${w - 24}" height="40" rx="20" fill="${bg}"/>
      <text x="48" y="${y + 14}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.text}">${esc(item.label)}</text>
      ${item.count != null ? `<text x="${w - 20}" y="${y + 14}" text-anchor="end" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" fill="${C.sub}">${item.count}</text>` : ''}
    `;
      y += 44;
      return row;
    })
    .join('');
  return `
  <rect x="0" y="${y0}" width="${w}" height="${h - y0}" fill="${C.canvas}"/>
  ${rows}
  `;
}

function linkRow(y, title, url, col, tags, w = 900) {
  return `
  <rect x="320" y="${y}" width="${w}" height="52" rx="8" fill="${C.white}" stroke="${C.border}" stroke-width="1"/>
  <text x="352" y="${y + 22}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" font-weight="500" fill="${C.text}">${esc(title)}</text>
  <text x="352" y="${y + 40}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" fill="${C.sub}">${esc(url)}</text>
  <text x="620" y="${y + 32}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" fill="${C.sub}">${esc(col)}</text>
  <text x="780" y="${y + 32}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" fill="${C.blue}">${esc(tags)}</text>
  `;
}

async function svgToPng(svg, filePath, width, height) {
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  console.log('Wrote', path.relative(root, filePath), `${width}x${height}`);
}

async function compositeIcon(basePath, iconSize, x, y) {
  const icon = await sharp(iconPath).resize(iconSize, iconSize).png().toBuffer();
  const meta = await sharp(basePath).metadata();
  await sharp(basePath)
    .composite([{ input: icon, left: x, top: y }])
    .png()
    .toFile(basePath + '.tmp');
  fs.renameSync(basePath + '.tmp', basePath);
}

async function screenshotDashboard() {
  const w = 1280;
  const h = 800;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${C.canvas}"/>
  ${chromeBar(w)}
  ${sidebar(260, h, 48, [
    { label: 'All links', count: 24 },
    { label: 'Favorites', count: null },
    { label: 'Links', count: 12 },
    { label: 'Reading list', count: 8 },
    { label: 'Work', count: 4 },
  ], 0)}
  <text x="292" y="100" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="26" fill="${C.text}">All links</text>
  <rect x="292" y="118" width="120" height="32" rx="16" fill="${C.tonal}"/>
  <text x="318" y="139" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="#001d35">Recently added</text>
  <rect x="960" y="88" width="120" height="40" rx="20" fill="${C.blue}"/>
  <text x="992" y="114" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="white">New link</text>
  <rect x="292" y="168" width="968" height="36" fill="${C.surface}" rx="4"/>
  <text x="308" y="190" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" font-weight="600" fill="${C.sub}">NAME</text>
  <text x="620" y="190" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" font-weight="600" fill="${C.sub}">COLLECTION</text>
  <text x="780" y="190" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" font-weight="600" fill="${C.sub}">TAGS</text>
  ${linkRow(220, 'React documentation', 'react.dev', 'Links', 'dev, docs')}
  ${linkRow(284, 'Chrome Web Store', 'chrome.google.com/webstore', 'Work', 'publish')}
  ${linkRow(348, 'Material Design 3', 'm3.material.io', 'Reading list', 'design')}
  ${linkRow(412, 'TypeScript handbook', 'typescriptlang.org/docs', 'Links', 'dev')}
  <rect x="292" y="520" width="968" height="240" rx="16" fill="${C.white}" stroke="${C.border}"/>
  <text x="320" y="560" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="18" font-weight="500" fill="${C.text}">Organise links in collections</text>
  <text x="320" y="590" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.sub}">Search, tags, list and grid views — all in your browser.</text>
</svg>`;
  const file = path.join(outDir, 'screenshot-01-dashboard-1280x800.png');
  await svgToPng(svg, file, w, h);
}

async function screenshotPopup() {
  const w = 1280;
  const h = 800;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.blueSoft}"/>
      <stop offset="100%" stop-color="${C.canvas}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <text x="640" y="120" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="42" font-weight="500" fill="${C.text}">Save links in one click</text>
  <text x="640" y="168" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="20" fill="${C.sub}">Toolbar popup · shortcut · right-click menu</text>
  <!-- popup card -->
  <rect x="440" y="220" width="400" height="420" rx="16" fill="${C.white}" stroke="${C.border}" filter="drop-shadow(0 8px 24px rgba(0,0,0,0.08))"/>
  <rect x="440" y="220" width="400" height="56" rx="16" fill="${C.surface}"/>
  <text x="468" y="256" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="16" font-weight="500" fill="${C.text}">LinkVault</text>
  <rect x="468" y="296" width="344" height="44" rx="8" stroke="${C.border}" fill="white"/>
  <text x="484" y="324" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="${C.sub}">https://example.com/article</text>
  <rect x="468" y="356" width="344" height="40" rx="20" fill="${C.blue}"/>
  <text x="640" y="381" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="white">Save to Links</text>
  <text x="468" y="430" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" font-weight="600" fill="${C.sub}">RECENT</text>
  <rect x="468" y="442" width="344" height="36" rx="8" fill="${C.surface}"/>
  <text x="484" y="465" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="${C.text}">React documentation</text>
  <rect x="468" y="486" width="344" height="36" rx="8" fill="${C.surface}"/>
  <text x="484" y="509" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="${C.text}">Chrome Web Store</text>
  <text x="640" y="720" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="16" fill="${C.sub}">Ctrl+Shift+S saves the current tab</text>
</svg>`;
  await svgToPng(svg, path.join(outDir, 'screenshot-02-popup-1280x800.png'), w, h);
}

async function screenshotShare() {
  const w = 1280;
  const h = 800;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#1a1a1a" opacity="0.35"/>
  <rect width="${w}" height="${h}" fill="${C.canvas}"/>
  ${chromeBar(w)}
  <rect x="0" y="48" width="${w}" height="${h - 48}" fill="${C.canvas}"/>
  <rect x="340" y="140" width="600" height="520" rx="24" fill="${C.white}" stroke="${C.border}"/>
  <text x="380" y="196" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="22" font-weight="500" fill="${C.text}">Share collection</text>
  <text x="380" y="228" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.sub}">Work · 4 links · Viewer or Editor access</text>
  <rect x="380" y="260" width="520" height="48" rx="12" fill="${C.surface}"/>
  <text x="400" y="290" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="${C.text}">https://linkvault.app/share/abc123…</text>
  <rect x="380" y="328" width="140" height="40" rx="20" fill="${C.blue}"/>
  <text x="450" y="353" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="white">Copy link</text>
  <rect x="532" y="328" width="120" height="40" rx="20" fill="${C.tonal}"/>
  <text x="592" y="353" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="#001d35">Copy URLs</text>
  <text x="380" y="410" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" font-weight="600" fill="${C.sub}">ACCESS</text>
  <rect x="380" y="424" width="240" height="44" rx="22" fill="${C.nav}"/>
  <text x="500" y="452" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.text}">Anyone with link · Viewer</text>
  <text x="380" y="520" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.sub}">Private links are never included in a share.</text>
</svg>`;
  await svgToPng(svg, path.join(outDir, 'screenshot-03-share-1280x800.png'), w, h);
}

async function screenshotGridDark() {
  const w = 1280;
  const h = 800;
  const cards = [
    { t: 'React docs', u: 'react.dev' },
    { t: 'MDN Web Docs', u: 'developer.mozilla.org' },
    { t: 'GitHub', u: 'github.com' },
    { t: 'Figma', u: 'figma.com' },
    { t: 'Notion', u: 'notion.so' },
    { t: 'Vite', u: 'vitejs.dev' },
  ];
  let cardSvg = '';
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 292 + col * 210;
    const y = 200 + row * 160;
    cardSvg += `
    <rect x="${x}" y="${y}" width="190" height="140" rx="12" fill="${C.darkSurface}" stroke="${C.border}"/>
    <rect x="${x + 16}" y="${y + 16}" width="40" height="40" rx="8" fill="${C.nav}"/>
    <text x="${x + 16}" y="${y + 78}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" font-weight="500" fill="${C.darkText}">${esc(c.t)}</text>
    <text x="${x + 16}" y="${y + 98}" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="11" fill="${C.darkSub}">${esc(c.u)}</text>`;
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${C.darkCanvas}"/>
  ${chromeBar(w).replace(/#ffffff/g, C.darkSurface).replace(C.text, C.darkText)}
  <rect x="0" y="48" width="260" height="${h - 48}" fill="${C.darkCanvas}"/>
  <text x="24" y="100" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.darkText}">Reading list</text>
  <rect x="12" y="116" width="236" height="40" rx="20" fill="${C.nav}"/>
  <text x="48" y="142" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.darkText}">Grid view</text>
  <text x="292" y="120" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="26" fill="${C.darkText}">Reading list</text>
  <text x="292" y="168" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${C.darkSub}">Dark theme · pinned favourites</text>
  ${cardSvg}
</svg>`;
  await svgToPng(svg, path.join(outDir, 'screenshot-04-grid-dark-1280x800.png'), w, h);
}

async function screenshotOrganise() {
  const w = 1280;
  const h = 800;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${C.blue}"/>
  <rect x="80" y="80" width="1120" height="640" rx="32" fill="${C.white}"/>
  <text x="120" y="160" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="36" font-weight="500" fill="${C.text}">Your links. Your browser.</text>
  <text x="120" y="210" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="18" fill="${C.sub}">No account · local storage · optional sync via Chrome</text>
  <g font-family="Segoe UI, Roboto, Arial, sans-serif">
    <rect x="120" y="260" width="320" height="120" rx="16" fill="${C.blueSoft}"/>
    <text x="148" y="300" font-size="16" font-weight="600" fill="${C.blue}">Collections</text>
    <text x="148" y="330" font-size="14" fill="${C.sub}">Folders, tags, search</text>
    <rect x="460" y="260" width="320" height="120" rx="16" fill="${C.blueSoft}"/>
    <text x="488" y="300" font-size="16" font-weight="600" fill="${C.blue}">Share</text>
    <text x="488" y="330" font-size="14" fill="${C.sub}">Viewer or editor links</text>
    <rect x="800" y="260" width="320" height="120" rx="16" fill="${C.blueSoft}"/>
    <text x="828" y="300" font-size="16" font-weight="600" fill="${C.blue}">Privacy</text>
    <text x="828" y="330" font-size="14" fill="${C.sub}">Private links stay private</text>
  </g>
  <text x="120" y="480" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="28" font-weight="500" fill="${C.text}">LinkVault — Link Manager</text>
</svg>`;
  const file = path.join(outDir, 'screenshot-05-features-1280x800.png');
  await svgToPng(svg, file, w, h);
  await compositeIcon(file, 96, 120, 400);
}

async function promoTile() {
  const w = 440;
  const h = 280;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b57d0"/>
      <stop offset="100%" stop-color="#004a77"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <text x="24" y="52" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="28" font-weight="600" fill="white">LinkVault</text>
  <text x="24" y="88" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="15" fill="#c2e7ff">Save &amp; organise links</text>
  <rect x="24" y="120" width="180" height="8" rx="4" fill="rgba(255,255,255,0.35)"/>
  <rect x="24" y="120" width="120" height="8" rx="4" fill="white"/>
  <text x="24" y="168" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="13" fill="#eaf1fb">Collections · tags · share</text>
  <text x="24" y="248" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.8)">Chrome extension</text>
</svg>`;
  const file = path.join(outDir, 'promo-tile-440x280.png');
  await svgToPng(svg, file, w, h);
  await compositeIcon(file, 72, 320, 180);
}

async function marquee() {
  const w = 1400;
  const h = 560;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${C.canvas}"/>
  <rect width="${w}" height="${h}" fill="${C.blueSoft}" opacity="0.5"/>
  <text x="80" y="200" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="56" font-weight="500" fill="${C.text}">LinkVault</text>
  <text x="80" y="260" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="28" fill="${C.sub}">The tidy home for every link you save</text>
  <rect x="80" y="300" width="200" height="48" rx="24" fill="${C.blue}"/>
  <text x="180" y="332" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="18" fill="white">Free · Productivity</text>
  <rect x="900" y="80" width="420" height="400" rx="24" fill="white" stroke="${C.border}"/>
  <text x="930" y="140" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="20" fill="${C.text}">All links</text>
  ${linkRow(160, 'Saved tab', 'example.com', 'Links', 'tag', 360).replace(/320/g, '930').replace(/620/g, '1050')}
</svg>`;
  const file = path.join(outDir, 'marquee-1400x560.png');
  await svgToPng(svg, file, w, h);
  await compositeIcon(file, 128, 80, 60);
}

async function main() {
  if (!fs.existsSync(iconPath)) throw new Error('Missing icon: ' + iconPath);
  fs.mkdirSync(outDir, { recursive: true });
  await screenshotDashboard();
  await screenshotPopup();
  await screenshotShare();
  await screenshotGridDark();
  await screenshotOrganise();
  await promoTile();
  await marquee();
  console.log('\nUpload from store/graphics/ — screenshots 1280x800, promo 440x280, marquee 1400x560 (optional).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
