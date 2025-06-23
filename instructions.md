// ============================== File: manifest.json ==============================
{
"manifest_version": 3,
"name": "Twitter Bot Filter",
"description": "Hide tweets that match user‑defined bot rules (e.g. too many cashtags).",
"version": "1.0.0",
"permissions": ["storage", "scripting"],
"host_permissions": [
"https://twitter.com/",
"https://x.com/"
],
"action": {
"default_title": "Bot Filter",
"default_popup": "popup.html"
},
"content_scripts": [
{
"matches": ["https://twitter.com/", "https://x.com/"],
"js": ["content_script.js"],
"run_at": "document_idle"
}
],
"options_page": "options.html",
"icons": {
"16": "icons/icon16.png",
"32": "icons/icon32.png",
"48": "icons/icon48.png",
"128": "icons/icon128.png"
}
}

// ============================== File: content_script.js ==============================
(() => {
const DEFAULT_RULES = {
cashtag: { operator: 'gt', value: 3 }
};

// -------------------- helpers --------------------
function loadRules() {
return new Promise(resolve => {
chrome.storage.sync.get(['rules'], data => {
resolve(data.rules || DEFAULT_RULES);
});
});
}

function shouldHide(tweetText, rules) {
const cashtags = tweetText.match(/$[A-Za-z]{1,5}\b/g) || [];
const count = cashtags.length;
const rule = rules.cashtag;
if (!rule) return false;
switch (rule.operator) {
case 'gt': return count > rule.value;
case 'gte': return count >= rule.value;
case 'eq': return count === rule.value;
case 'lt': return count < rule.value;
case 'lte': return count <= rule.value;
default: return false;
}
}

function evaluateTweet(article, rules) {
if (article.dataset.botFilterChecked) return;
const textEl = article.querySelector('[data-testid="tweetText"]');
const tweetText = textEl ? textEl.innerText : article.innerText;
if (shouldHide(tweetText, rules)) {
article.style.display = 'none';
}
article.dataset.botFilterChecked = 'true';
}

async function init() {
const rules = await loadRules();

// First pass on already‑rendered tweets
document.querySelectorAll('article[data-testid="tweet"]').forEach(a => evaluateTweet(a, rules));

// Keep watching the feed – Twitter uses infinite scroll
const observer = new MutationObserver(mutations => {
mutations.forEach(m => {
m.addedNodes.forEach(node => {
if (node.nodeType === 1) {
node.querySelectorAll?.('article[data-testid="tweet"]').forEach(a => evaluateTweet(a, rules));
if (node.matches?.('article[data-testid="tweet"]')) evaluateTweet(node, rules);
}
});
});
});
observer.observe(document.body, { childList: true, subtree: true });

// Hot‑reload when the user changes rules in Options
chrome.storage.onChanged.addListener((changes, area) => {
if (area === 'sync' && changes.rules) {
const newRules = changes.rules.newValue || DEFAULT_RULES;
document.querySelectorAll('article[data-testid="tweet"]').forEach(a => {
a.style.display = '';
delete a.dataset.botFilterChecked;
evaluateTweet(a, newRules);
});
}
});

}

init();
})();

// ============================== File: options.html ==============================

// ============================== File: options.js ==============================
/_ global chrome _/
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('ruleForm').addEventListener('submit', saveOptions);

function saveOptions(e) {
e.preventDefault();
const operator = document.getElementById('operator').value;
const value = parseInt(document.getElementById('value').value, 10);
const rules = { cashtag: { operator, value } };

chrome.storage.sync.set({ rules }, () => {
const status = document.getElementById('status');
status.textContent = 'Options saved.';
setTimeout(() => status.textContent = '', 1200);
});
}

function restoreOptions() {
chrome.storage.sync.get(['rules'], data => {
const rule = data.rules?.cashtag;
if (rule) {
document.getElementById('operator').value = rule.operator;
document.getElementById('value').value = rule.value;
}
});
}

// ============================== File: popup.html ==============================

// ============================== File: popup.js ==============================
/_ global chrome _/
document.getElementById('openOptions').addEventListener('click', () => {
chrome.runtime.openOptionsPage();
});

// ============================== Folder: icons/ ==============================
// Put any 16×16, 32×32, 48×48 & 128×128 PNGs you like here – e.g. a simple filter icon.

// =====================================================================================
// Quick start
// 1. Create a folder on your disk (e.g. twitter-bot-filter)
// 2. Copy each file above into that folder, matching the names/paths (create icons/ sub‑folder)
// 3. Visit chrome://extensions, enable Developer mode, click Load unpacked and pick the folder
// 4. Click the extension’s icon → Open Options to tweak the cashtag rule
// 5. Refresh Twitter/X and enjoy a cleaner feed 🎉
// =====================================================================================
