import { addLink } from '../services/storage';

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
