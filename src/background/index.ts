import { addLink, loadData, setLinkStatuses, type CheckResult } from '../services/storage';
import { checkLink, hasPagePermission, pool } from '../services/meta';
import { getSettings } from '../services/settings';

const MENU_LINK = 'lv-save-link';
const MENU_PAGE = 'lv-save-page';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_LINK, title: 'Save link to LinkVault', contexts: ['link'] });
  chrome.contextMenus.create({ id: MENU_PAGE, title: 'Save page to LinkVault', contexts: ['page'] });
});

function badge(text: string) {
  chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
  chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1500);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_LINK && info.linkUrl) {
    await addLink({ url: info.linkUrl, title: info.selectionText });
    badge('✓');
  } else if (info.menuItemId === MENU_PAGE && tab?.url) {
    await addLink({ url: tab.url, title: tab.title });
    badge('✓');
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-current-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    await addLink({ url: tab.url, title: tab.title });
    badge('✓');
  }
});

/* ---------- Daily link health check (opt-in) ---------- */
const ALARM = 'lv-health';
const WEEK = 7 * 24 * 60 * 60 * 1000;

function ensureAlarm() {
  chrome.alarms.get(ALARM, (a) => {
    if (!a) chrome.alarms.create(ALARM, { delayInMinutes: 30, periodInMinutes: 24 * 60 });
  });
}
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const settings = await getSettings();
  if (!settings.autoCheck || !(await hasPagePermission())) return;
  const data = await loadData();
  const now = Date.now();
  // Oldest-checked first, capped so a big library is spread over several days.
  const due = data.links
    .filter((l) => !l.deletedAt && /^https?:/i.test(l.url) && (!l.checkedAt || now - l.checkedAt > WEEK))
    .sort((a, b) => (a.checkedAt ?? 0) - (b.checkedAt ?? 0))
    .slice(0, 40);
  if (!due.length) return;
  const results: CheckResult[] = [];
  await pool(due, 4, async (l) => {
    results.push({ id: l.id, ...(await checkLink(l.url)) });
  });
  // If everything "failed", the device is probably offline: don't mark anything.
  if (results.length >= 5 && results.every((r) => r.status === 'broken' && r.code === undefined)) return;
  await setLinkStatuses(results);
  const broken = results.filter((r) => r.status === 'broken').length;
  if (broken) {
    chrome.action.setBadgeBackgroundColor({ color: '#b3261e' });
    chrome.action.setBadgeText({ text: String(broken) });
  }
});
