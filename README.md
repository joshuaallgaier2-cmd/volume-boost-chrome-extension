# 🔊 Volume Booster Chrome Extension

## ✨ Features
*   **Volume Amplification:** Boost system or browser audio volume up to 250% (5x).
*   **Web Audio API Integration:** Uses advanced Web Audio API techniques for seamless, low-distortion boosting across modern web media.
*   **Dynamic Content Support:** Monitors the page for newly loaded `<audio>` and `<video>` elements (e.g., embedded players) and applies boost automatically.
*   **Persistent Settings:** Saves the desired boost level using `chrome.storage` for persistence between sessions.

## 🚀 Installation & Usage Guide

### 1. Setup
1.  Place all files in the `volume-boost-chrome-extension` directory.
2.  (Optional but Recommended) Add placeholder icons (`icon-16.png`, `icon-48.png`, `icon-128.png`) to the `src/icons/` folder.
3.  Load the extension in Chrome: Go to `chrome://extensions/`, enable Developer mode, and click "Load unpacked" pointing to the root `volume-boost-chrome-extension` directory.

### 2. How It Works
The extension operates via three main components:
1.  **`manifest.json`**: Declares permissions and loads content scripts on all web pages (`<all_urls>`).
2.  **`content-scripts/audio-enhancer.js`**: This script runs on the webpage, observes changes in the DOM (using `MutationObserver`), finds media elements (`<video>`, `<audio>`), and hooks them into the Web Audio API to insert a gain node configured by the user's boost level.
3.  **`public/popup.html`/`.js`**: Provides the user interface. The slider controls the desired boost multiplier (0 to 5). When changed, it communicates with `background.js`, which then instructs the content script to apply or remove the enhancement.

### 3. Usage
1.  Click the extension icon in your browser toolbar.
2.  Use the **Volume Slider** to set your desired boost level (1 is normal, 5 is max).
3.  Click **Activate Boost**. The status should update, and audio on most pages will be boosted immediately.
4.  To stop boosting, simply reset the slider or click **Deactivate Boost**.

## 🛠️ Technical Notes
*   **Web Audio API:** This implementation relies heavily on `AudioContext` to manage audio streams and apply a gain filter without clipping (distortion) if possible.
*   **Permissions:** Requires `<all_urls>` host permission to monitor all web content for media elements.
