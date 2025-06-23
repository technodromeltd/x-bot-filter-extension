document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("ruleForm").addEventListener("submit", saveOptions);

function saveOptions(e) {
  e.preventDefault();
  const value = parseInt(document.getElementById("value").value, 10);
  const filterNonEnglish = document.getElementById("filterNonEnglish").checked;
  const debugLogging = document.getElementById("debugLogging").checked;
  const rules = { cashtag: { value }, filterNonEnglish, debugLogging };

  chrome.storage.sync.set({ rules }, () => {
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(() => (status.textContent = ""), 1200);
  });
}

function restoreOptions() {
  chrome.storage.sync.get(["rules"], (data) => {
    const rule = data.rules?.cashtag;
    if (rule) {
      document.getElementById("value").value = rule.value;
    }
    document.getElementById("filterNonEnglish").checked =
      !!data.rules?.filterNonEnglish;
    document.getElementById("debugLogging").checked =
      !!data.rules?.debugLogging;
  });
}
