(() => {
  const DEFAULT_RULES = {
    cashtag: { value: 3 },
  };

  // -------------------- helpers --------------------
  function loadRules() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["rules"], (data) => {
        resolve(data.rules || DEFAULT_RULES);
      });
    });
  }

  function isEnglish(text) {
    // Remove URLs, mentions, hashtags, cashtags, and numbers
    const cleaned = text.replace(/https?:\/\/\S+|[@#]\w+|\$\w+|\d+/g, "");
    // Count English letters
    const englishLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
    // Count all letters
    const totalLetters = (cleaned.match(/[\p{L}]/gu) || []).length;
    // If more than 80% of letters are English, consider it English
    return totalLetters === 0 ? false : englishLetters / totalLetters > 0.8;
  }

  function shouldHide(tweetText, rules) {
    if (rules.filterNonEnglish && !isEnglish(tweetText)) return true;
    const cashtags = tweetText.match(/\$[A-Za-z]{1,5}\b/g) || [];
    const count = cashtags.length;
    const rule = rules.cashtag;
    if (!rule) return false;
    // Only support 'gte' operator
    return count >= rule.value;
  }

  function hideVisibleTweets(rules) {
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach((article) => {
        if (!article.dataset.botFilterChecked) {
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const tweetText = textEl ? textEl.innerText : article.innerText;
          const cashtags = tweetText.match(/\$[A-Za-z]{1,5}\b/g) || [];
          let reason = "";
          if (rules.filterNonEnglish && !isEnglish(tweetText)) {
            reason = "non-English";
          } else if (shouldHide(tweetText, rules)) {
            reason = `cashtags (${cashtags.length})`;
          } else {
            reason = "not filtered";
          }
          if (reason !== "not filtered") {
            article.style.display = "none";
            if (rules.debugLogging) {
              console.log(
                `[BotFilter] HIDDEN:`,
                `Cashtags: ${cashtags.length}, Reason: ${reason}`,
                "\nText:",
                tweetText
              );
            }
          }
          article.dataset.botFilterChecked = "true";
        }
      });
  }

  // --- Debounce utility ---
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function init() {
    let rules = await loadRules();
    console.log("rules", rules);

    // Initial observer: wait for first tweets to appear, then process and disconnect
    const initialObserver = new MutationObserver(() => {
      console.log("Initial observer triggered");
      const tweets = document.querySelectorAll('article[data-testid="tweet"]');
      console.log("tweets.length", tweets.length);
      if (tweets.length > 0) {
        hideVisibleTweets(rules);
        initialObserver.disconnect();
      }
    });
    initialObserver.observe(document.body, { childList: true, subtree: true });

    // Watch for new tweets and mark them for later processing
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            node
              .querySelectorAll?.('article[data-testid="tweet"]')
              .forEach((a) => {
                delete a.dataset.botFilterChecked;
              });
            if (node.matches?.('article[data-testid="tweet"]'))
              delete node.dataset.botFilterChecked;
          }
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Re-hide on scroll (debounced)
    window.addEventListener(
      "scroll",
      debounce(() => {
        hideVisibleTweets(rules);
      }, 100)
    );

    // Hot-reload when the user changes rules in Options
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.rules) {
        rules = changes.rules.newValue || DEFAULT_RULES;
        document
          .querySelectorAll('article[data-testid="tweet"]')
          .forEach((a) => {
            a.style.display = "";
            delete a.dataset.botFilterChecked;
          });
        hideVisibleTweets(rules);
      }
    });
  }

  init();
})();
