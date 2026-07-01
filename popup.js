const slider = document.getElementById('boost');
const valueLabel = document.getElementById('value');

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

      chrome.tabs.sendMessage(tab.id, { type: 'setBoost', boost: level }, () => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              files: ['content.js']
            },
            () => {
              chrome.tabs.sendMessage(tab.id, { type: 'setBoost', boost: level });
            }
          );
        }
      });
    });
  });
}

slider.addEventListener('input', (event) => {
  const level = Number(event.target.value);
  updateLabel(level);
  applyBoost(level);
});

chrome.storage.sync.get(['boost'], (result) => {
  const level = Number(result.boost) || 1;
  slider.value = level;
  updateLabel(level);
  applyBoost(level);
});
