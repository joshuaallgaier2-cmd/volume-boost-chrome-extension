// content-scripts/audio-enhancer.js
/**
 * Content script responsible for detecting and boosting audio output volume using the Web Audio API.
 * It hooks into HTML <audio> and <video> elements to apply volume boost.
 */

let activeBoosters = new Map(); // Track element -> gainNode mapping
const BOOST_GAIN_NODE_CLASS = 'volume-booster-gain-node';

/**
 * Applies a gain node to an audio element, boosting the volume.
 * @param {HTMLMediaElement} mediaElement The audio or video element.
 * @param {number} boostLevel A float between 0 and 5 (1 being normal).
 */
function applyVolumeBoost(mediaElement, boostLevel) {
    // Prevent re-processing if already boosted
    if (activeBoosters.has(mediaElement)) {
        console.log('[Volume Booster] Already applied boost to:', mediaElement.id || mediaElement.src);
        return;
    }

    try {
        // Use the Web Audio API Context - resume if suspended
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(err => {
                console.warn('[Volume Booster] Could not resume AudioContext:', err);
            });
        }

        // Create Media Element Source - this wraps the HTML media element
        const sourceNode = audioContext.createMediaElementSource(mediaElement);

        // Create Gain Node for volume control
        const gainNode = audioContext.createGain();
        
        // Set initial gain value (boostLevel: 1.0 = normal, >1 = boost, <1 = reduce)
        const targetGain = Math.min(boostLevel, 5); // Cap at 5x boost
        gainNode.gain.setValueAtTime(targetGain, audioContext.currentTime);

        // Connect: Source -> Gain Node -> Destination (speakers)
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Store reference for cleanup
        mediaElement.setAttribute('data-volume-booster', 'true');
        mediaElement.dataset.volumeBoosterGain = gainNode;
        activeBoosters.set(mediaElement, { gainNode, audioContext });

        console.log(`[Volume Booster] Successfully boosted volume for ${mediaElement.tagName} element.`);

    } catch (e) {
        console.error("[Volume Booster] Error applying boost:", e.message, e.stack);
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
 * Cleans up all applied volume boosts.
 */
function cleanupAllBoosters() {
    activeBoosters.forEach(({ gainNode, audioContext }, element) => {
        try {
            if (gainNode) {
                // Disconnect the gain node from destination
                gainNode.disconnect();
            }
            // Remove attributes
            element.removeAttribute('data-volume-booster');
            element.dataset.volumeBoosterGain = '';
        } catch (e) {
            console.warn("Could not clean up audio node:", e.message);
        }
    });
    activeBoosters.clear();
}

/**
 * Message handler to receive boost levels from the popup/background script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "APPLY_BOOST") {
        const boostLevel = message.boost;
        console.log(`[Content Script] Received command to apply boost at level: ${boostLevel}`);
        initializeBoost(boostLevel);

        sendResponse({ success: true, message: `Audio volume boosted successfully.` });
    } else if (message.action === "REMOVE_BOOST") {
        console.log("[Content Script] Received command to remove boost.");
        cleanupAllBoosters();
        sendResponse({ success: true, message: `Audio volume restored.` });
    } else if (message.action === "GET_STATUS") {
        const boostedCount = activeBoosters.size;
        sendResponse({ 
            success: true, 
            message: `${boostedCount} audio element(s) currently boosted.`,
            count: boostedCount 
        });
    }
});

// --- Mutation Observer for dynamic content loading (e.g., YouTube embeds) ---
const observer = new MutationObserver((mutationsList) => {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    const tagName = node.tagName;
                    if ((tagName === 'VIDEO' || tagName === 'AUDIO') && !activeBoosters.has(node)) {
                        // Get current boost level from slider or default to 1
                        const volumeSlider = document.getElementById('volumeSlider');
                        const currentBoostLevel = volumeSlider ? parseFloat(volumeSlider.value) : 1;
                        applyVolumeBoost(node, currentBoostLevel);
                    }
                }
            });
        }
    }
});

// Start observing the body for changes in children
observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

// Log initialization
console.log('[Volume Booster] Content script initialized. Waiting for boost commands...');