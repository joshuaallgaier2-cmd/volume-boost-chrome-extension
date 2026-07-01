const state = {
  boost: 1,
  audioContext: null,
  mediaNodes: new WeakMap(),
  observer: null,
  connectedElements: new WeakSet()
};

// Flag to track if AudioContext has been initialized by user gesture
let audioContextInitialized = false;

function ensureAudioContext() {
  // If already initialized by user gesture, return existing context
  if (audioContextInitialized && state.audioContext) {
    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume().catch(() => {});
    }
    return state.audioContext;
  }

  // Don't create AudioContext on page load - wait for user gesture
  const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextImpl) {
    return null;
  }

  try {
    state.audioContext = new AudioContextImpl();
    audioContextInitialized = true;
    return state.audioContext;
  } catch (error) {
    // Context creation failed, fall back to direct volume manipulation
    console.warn('AudioContext creation failed:', error);
    return null;
  }
}

function applyToElement(media) {
  if (!(media instanceof HTMLMediaElement)) {
    return;
  }

  // Check if already connected
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

  // Try direct volume manipulation first (no AudioContext needed)
  try {
    const baseVolume = Number(media.dataset.originalVolume || media.volume || 0.5);
    media.dataset.originalVolume = baseVolume;
    media.volume = Math.min(1, baseVolume * state.boost);
    return;
  } catch (error) {
    console.warn('Direct volume manipulation failed:', error);
  }

  // Fall back to Web Audio API if direct manipulation doesn't work
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  try {
    const source = context.createMediaElementSource(media);
    const gainNode = context.createGain();
    gainNode.gain.value = state.boost;

    source.connect(gainNode);
    gainNode.connect(context.destination);

    state.mediaNodes.set(media, { gain: gainNode });
    state.connectedElements.add(media);
  } catch (error) {
    console.warn('Web Audio API fallback failed:', error);
    // Final fallback to direct volume manipulation
    try {
      const baseVolume = Number(media.dataset.originalVolume || media.volume || 0.5);
      media.dataset.originalVolume = baseVolume;
      media.volume = Math.min(1, baseVolume * state.boost);
    } catch (e) {
      console.error('All volume manipulation methods failed:', e);
    }
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

// Removed initial applyToExistingMedia() call to avoid AudioContext autoplay policy errors
// The extension now works with direct volume manipulation by default
// Web Audio API is only used when needed and after user gesture
observeMedia();