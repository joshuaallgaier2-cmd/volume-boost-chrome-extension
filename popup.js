const slider = document.getElementById('boost');
const valueLabel = document.getElementById('value');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// Function definitions first
function updateLabel(level) {
  valueLabel.textContent = `${Number(level).toFixed(1)}x`;
}

function applyBoost(level) {
  chrome.storage.sync.set({ boost: level }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        return;
      }

      // Skip chrome:// URLs - they don't support content scripts
      const tabUrl = tab.url || '';
      if (tabUrl.startsWith('chrome://')) {
        return;
      }

      try {
        chrome.tabs.sendMessage(tab.id, { type: 'setBoost', boost: level });
      } catch (error) {
        // Message failed - this is expected when no content script is present
        // This is normal behavior and should not be treated as an error
      }
    });
  });
}

function toggleTheme() {
  chrome.storage.sync.get('theme', (result) => {
    const currentTheme = result.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeIcon.textContent = '🌙';
  }
  chrome.storage.sync.set({ theme: theme });
}

// Event listeners after functions are defined
slider.addEventListener('input', (event) => {
  const level = Number(event.target.value);
  updateLabel(level);
  applyBoost(level);
});

themeToggle.addEventListener('click', toggleTheme);

// Initialize on page load
chrome.storage.sync.get(['boost', 'theme'], (result) => {
  const level = Number(result.boost) || 1;
  const theme = result.theme || 'dark';

  slider.value = level;
  updateLabel(level);
  applyBoost(level);

  // Set initial theme
  setTheme(theme);
});
