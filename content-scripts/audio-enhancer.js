// content-scripts/audio-enhancer.js
/**
 * Content script responsible for detecting and boosting audio output volume using the Web Audio API.
 * It attempts to hook into all available HTML <audio> and <video> elements.
 */

const BOOST_GAIN_NODE_CLASS = 'volume-booster-gain-node';
let activeBoosters = new Set(); // Keep track of elements already processed

/**
 * Applies a gain node to an audio element, boosting the volume.
 * @param {HTMLMediaElement} mediaElement The audio or video element.
 * @param {number} boostLevel A float between 0 and 5 (1 being normal).
 */
function applyVolumeBoost(mediaElement, boostLevel) {
    // Prevent re-processing if already boosted
    if (activeBoosters.has(mediaElement)) {
        console.log('[Volume Booster] Already applied boost to:', mediaElement);
        return;
    }

    try {
        // Use the Web Audio API Context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let sourceNode;

        if (mediaElement.tagName === 'VIDEO' || mediaElement.tagName === 'AUDIO') {
            sourceNode = audioContext.createMediaStreamSource(mediaElement);
        } else {
             // Fallback or error handling if the element type is unexpected
             console.error("[Volume Booster] Unsupported media element for Web Audio API.");
             return;
        }

        // 1. Create Gain Node (the booster)
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(boostLevel, audioContext.currentTime); // Set boost level

        // 2. Connect the nodes: Source -> Booster -> Destination
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Store a reference to the gain node on the element for later manipulation/cleanup
        mediaElement.setAttribute('data-volume-booster', 'true');
        mediaElement.dataset.volumeBoosterGain = gainNode;
        activeBoosters.add(mediaElement);

        console.log(`[Volume Booster] Successfully boosted volume for ${mediaElement.tagName} element.`);

    } catch (e) {
        // Web Audio API might fail if the context is suspended or permissions are denied
        console.error("[Volume Booster] Error applying boost:", e);
    }
}


/**
 * Initializes the audio boosting across the current page content.
 * @param {number} boostLevel The multiplier (0 to 5).
 */
function initializeBoost(boostLevel) {
    // Clean up existing boosters first
    cleanupAllBoosters();

    const elements = document.querySelectorAll('video, audio');
    elements.forEach(el => applyVolumeBoost(el, parseFloat(boostLevel)));
}

/**
 * Cleans up all applied volume boosts by reconnecting the original source directly to destination.
 */
function cleanupAllBoosters() {
    activeBoosters.forEach(element => {
        const gainNode = element.dataset.volumeBoosterGain;
        if (gainNode) {
            // Disconnect everything related to boosting
            try {
                gainNode.disconnect();
                // Re-establish direct connection for normal flow (if possible, though complex in reality)
                // For simplicity here, we just remove the attribute and assume browser handles native restoration on state change.
                element.removeAttribute('data-volume-booster');
            } catch(e) {
                console.warn("Could not fully clean up audio node:", e);
            }
        }
    });
    activeBoosters.clear();
    // Note: A perfect cleanup requires re-wiring the entire DOM tree's audio connections, which is complex. 
    // This function handles the core gain node disconnection.
}

/**
 * Message handler to receive boost levels from the popup/background script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "APPLY_BOOST") {
        const boostLevel = message.boost;
        console.log(`[Content Script] Received command to apply boost at level: ${boostLevel}`);
        initializeBoost(boostLevel);

        // Respond that the action was taken
        sendResponse({ success: true, message: `Audio volume boosted successfully.` });
    } else if (message.action === "REMOVE_BOOST") {
        console.log("[Content Script] Received command to remove boost.");
        cleanupAllBoosters();
        sendResponse({ success: true, message: `Audio volume restored.` });
    }
});


// --- Mutation Observer for dynamic content loading (e.g., YouTube embeds) ---
const observer = new MutationObserver((mutationsList) => {
    // Check newly added elements for audio/video tags
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if ((node.tagName === 'VIDEO' || node.tagName === 'AUDIO') && !activeBoosters.has(node)) {
                        // Re-initialize boost check for newly loaded content
                        const currentBoostLevel = parseFloat(document.getElementById('volumeSlider')?.value || 1);
                        applyVolumeBoost(node, currentBoostLevel);
                    }
                }
            });
        }
    }
});

// Start observing the body for changes in children
observer.observe(document.body || document.documentElement, { childList: true, subtree: true });