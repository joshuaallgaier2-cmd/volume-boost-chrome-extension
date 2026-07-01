const state = {
  boost: 1,
  audioContext: null,
  mediaNodes: new WeakMap(),
  observer: null,
  connectedElements: new WeakSet()
};

function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextImpl();
  }

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }

  return state.audioContext;
}

function applyToElement(media) {
  if (!(media instanceof HTMLMediaElement)) {
    return;
  }

  if (state.connectedElements.has(media)) {
    const node = state.mediaNodes.get(media);
    if (node) {
      node.gain.gain.value = state.boost;
    }

    const baseVolume = Number(media.dataset.originalVolume || media.volume || 0.5);
    media.dataset.originalVolume = baseVolume;
    media.volume = Math.min(1, baseVolume * state.boost);
    return;
  }

  try {
    const context = ensureAudioContext();
    const source = context.createMediaElementSource(media);
    const gainNode = context.createGain();
    gainNode.gain.value = state.boost;

    source.connect(gainNode);
    gainNode.connect(context.destination);

    state.mediaNodes.set(media, { gain: gainNode });
    state.connectedElements.add(media);
  } catch (error) {
    const baseVolume = Number(media.dataset.originalVolume || media.volume || 0.5);
    media.dataset.originalVolume = baseVolume;
    media.volume = Math.min(1, baseVolume * state.boost);
  }
}

function applyToExistingMedia() {
  document.querySelectorAll('audio, video').forEach(applyToElement);
}

function observeMedia() {
  if (state.observer) {
    return;
  }

  state.observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) {
          continue;
        }

        if (node.matches('audio, video')) {
          applyToElement(node);
        }

        node.querySelectorAll('audio, video').forEach(applyToElement);
      }
    }
  });

  state.observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function setBoost(level) {
  state.boost = Math.max(1, Math.min(5, Number(level) || 1));
  applyToExistingMedia();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'setBoost') {
    setBoost(message.boost);
    sendResponse({ ok: true, boost: state.boost });
  } else if (message?.type === 'getBoost') {
    sendResponse({ boost: state.boost });
  }

  return true;
});

chrome.storage.sync.get(['boost'], (result) => {
  setBoost(result.boost || 1);
});

applyToExistingMedia();
observeMedia();
