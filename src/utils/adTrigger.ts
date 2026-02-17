/**
 * Triggers AdSense interstitial ads by opening the site in a new tab and closing it.
 * This simulates the user leaving and returning to the page, which can trigger
 * AdSense Vignette (interstitial) ads.
 * 
 * @param callback - Function to execute after the popup closes
 */
export const triggerAdByPopup = (callback?: () => void) => {
    // Open own site in new tab
    const popup = window.open('https://puzzles.tmhub.co.kr', '_blank');

    setTimeout(() => {
        if (popup) {
            popup.close();
        }
        if (callback) {
            callback();
        }
    }, 100);
};
