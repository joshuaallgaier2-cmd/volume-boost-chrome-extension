// background.js
// This service worker handles persistent state and messaging between components.

console.log("Volume Booster Background Service Worker loaded.");

/**
 * Initializes default settings upon service worker startup safely.
 */
function initializeDefaultSettings() {
    // Check if the necessary Chrome APIs are available before attempting storage access
    if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
        chrome.storage.sync.get(['isBoostActive', 'volumeBoost'], (data) => {
            if (typeof data.isBoostActive === 'undefined') {
                console.log("[Background] Setting initial default volume boost state.");
                chrome.storage.sync.set({ isBoostActive: false, volumeBoost: 1 });
            }
        });
    } else {
        console.warn("[Background] Chrome storage API not available during initialization. State might be lost.");
    }
}

initializeDefaultSettings();


// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SET_VOLUME_BOOST") {
        const boostLevel = message.boost; // Should be a float between 0 and 5

        console.log(`[Background] Received request to set volume boost: ${boostLevel}`);

        // 1. Update storage for persistence (Check API availability here too)
        if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
            chrome.storage.sync.set({ 
                isBoostActive: true, 
                volumeBoost: boostLevel 
            }, () => {
                console.log("[Background] Volume boost saved successfully.");
                sendResponse({ status: "success", message: `Volume set to ${Math.round(boostLevel * 25)}%` });
            });
        } else {
             sendResponse({ status: "error", message: "Chrome storage API unavailable." });
        }

        // Note: The actual audio manipulation (like applying gain nodes) is done in the content script,
        // which has access to the DOM and Web Audio API context. This service worker just manages state.
    } else if (message.action === "GET_VOLUME_BOOST") {
        if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
            chrome.storage.sync.get(['volumeBoost'], (data) => {
                const boost = data.volumeBoost || 1;
                sendResponse({ status: "success", boostLevel: parseFloat(boost) });
            });
        } else {
             sendResponse({ status: "error", message: "Chrome storage API unavailable." });
        }
    } else {
        sendResponse({ status: "error", message: "Unknown action." });
    }

    // Return true to indicate that the response will be sent asynchronously
    return true; 
});
