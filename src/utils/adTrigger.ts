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

/**
 * Shows a persistent modal overlay that stays open until user clicks close button.
 * For testing AdSense ad triggers.
 */
export const showPersistentModal = () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
    `;

    content.innerHTML = `
        <h2 style="margin: 0 0 1rem 0; color: #333;">광고 로딩 중...</h2>
        <p style="margin: 0 0 1.5rem 0; color: #666;">잠시만 기다려주세요</p>
        <button id="closeAdModal" style="
            padding: 0.75rem 2rem;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
        ">닫기</button>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Add close button handler
    const closeBtn = document.getElementById('closeAdModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.body.removeChild(overlay);
        };
    }
};
