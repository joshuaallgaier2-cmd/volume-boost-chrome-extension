// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggleButton');
    const volumeSlider = document.getElementById('volumeSlider');
    const boostLevelDisplay = document.getElementById('boostLevelDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const closeButton = document.getElementById('closeButton');

    // Helper function to safely access chrome storage
    const getStorage = () => {
        if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
            return chrome.storage;
        } else {
            console.error("Chrome Storage API is not available.");
            return null;
        }
    };

    // Load saved state or use defaults
    const storage = getStorage();
    if (storage) {
        storage.get(['isBoostActive', 'volumeBoost'], (data) => {
            const isActive = data.isBoostActive === true;
            let boostValue = parseFloat(data.volumeBoost) || 1;

            toggleButton.textContent = isActive ? "Deactivate Boost" : "Activate Boost";
            toggleButton.disabled = false; // Assuming it should be enabled on load
            volumeSlider.value = boostValue.toFixed(1); // Ensure slider value matches stored float precision
            updateDisplay(boostValue);
        });
    } else {
        // Fallback UI state if storage is unavailable
        console.warn("Cannot load saved state: Chrome Storage API missing.");
    }

    const updateDisplay = (value) => {
        // Scale 0-5 slider value to percentage display (e.g., 1 -> 100%)
        const percentage = Math.round((parseFloat(value) * 25)); // Max boost is 250% (5*50%)
        boostLevelDisplay.textContent = `${percentage}%`;

        // Update the button's state based on a threshold or just mirror the slider
        if (parseFloat(value) > 1) {
             toggleButton.disabled = false;
             toggleButton.textContent = "Deactivate Boost";
        } else if (parseFloat(value) < 0.5 && parseFloat(value) !== 0) {
             toggleButton.textContent = "Boosting..."; // Optional state
             toggleButton.disabled = false;
        } else if (parseFloat(value) === 1) {
            toggleButton.textContent = "Activate Boost"; // Default state when slider is at 1
        } else {
             toggleButton.textContent = "Boost Level Too Low";
             toggleButton.disabled = true;
        }
    };

    // Event listener for the slider (Updated to trigger immediate action)
    volumeSlider.addEventListener('input', (event) => {
        const value = event.target.value;
        updateDisplay(parseFloat(value));
        
        // Send message immediately to content script on input change, even if boost is inactive, 
        // so the user sees real-time feedback/preview of the level change.
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "APPLY_BOOST", boost: parseFloat(value) });
            }
        });
    });

    // Event listener for the toggle button
    toggleButton.addEventListener('click', () => {
        const currentBoostValue = parseFloat(volumeSlider.value);
        const isActive = toggleButton.textContent === "Deactivate Boost";

        if (isActive) {
            // Deactivate boost: clear storage AND notify content script
            storage.set({ isBoostActive: false, volumeBoost: 1 }, () => {
                broadcastRemoveBoost();
                toggleButton.textContent = "Activate Boost";
                statusMessage.textContent = "Volume boost deactivated.";
            });
        } else {
            // Activate or update the boost level
            if (currentBoostValue >= 0.5) {
                // Save state AND notify content script
                storage.set({ isBoostActive: true, volumeBoost: currentBoostValue }, () => {
                    broadcastBoost(currentBoostValue);
                    toggleButton.textContent = "Deactivate Boost";
                    statusMessage.textContent = `Volume boosted to ${Math.round(currentBoostValue * 25)}%.`;
                });
            } else {
                statusMessage.textContent = "Please set a boost level above minimum (0%).";
            }
        }
    });

    // Event listener for the close button
    closeButton.addEventListener('click', () => {
        window.close();
    });
});