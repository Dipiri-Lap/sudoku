/**
 * Triggers AdSense interstitial ads by briefly showing a modal overlay.
 * This simulates the user leaving and returning to the page, which can trigger
 * AdSense Vignette (interstitial) ads, without opening a new browser window.
 * 
 * @param callback - Function to execute after the modal closes
 */
export const triggerAdByPopup = (callback?: () => void) => {
    // Create a temporary modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    document.body.appendChild(overlay);

    // Remove overlay and execute callback after 100ms
    setTimeout(() => {
        document.body.removeChild(overlay);
        if (callback) {
            callback();
        }
    }, 100);
};
