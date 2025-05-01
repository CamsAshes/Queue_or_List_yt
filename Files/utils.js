// --- utils.js ---
(function() {
    "use strict";
    console.log("Loading: utils.js");

    // Avoid redefining if already loaded by a previous bookmarklet click this session
    if (window.ytBulkActionsUtils) {
        console.log("Utils already defined.");
        return;
    }

    window.ytBulkActionsUtils = (function() {
        "use strict";

        /**
         * Pauses execution for a specified time, adding randomness based on a percentage.
         * @param {number} baseDelayMs - The base time to wait in milliseconds.
         * @param {number} randomnessPercent - Percentage (0-100) of baseDelayMs to add as max random delay.
         * @returns {Promise<void>}
         */
        function sleepRandom(baseDelayMs, randomnessPercent = 0) {
            if (typeof baseDelayMs !== 'number' || baseDelayMs < 0) baseDelayMs = 100;
            if (typeof randomnessPercent !== 'number' || randomnessPercent < 0) randomnessPercent = 0;

            let randomAdditionalMs = 0;
            if (randomnessPercent > 0) {
                const maxAdditional = baseDelayMs * (Math.min(100, randomnessPercent) / 100.0);
                randomAdditionalMs = Math.random() * maxAdditional;
            }

            const totalWait = Math.round(baseDelayMs + randomAdditionalMs);
            // console.debug(`   Waiting ${totalWait}ms (Base: ${baseDelayMs}, Random: ${Math.round(randomAdditionalMs)})`);
            return new Promise(resolve => setTimeout(resolve, totalWait));
        }

        /**
         * Simulates a click event on an element. Attempts standard .click() first, falls back to dispatchEvent.
         * @param {Element | null} element - The DOM element to click.
         * @param {string} elementNameForLog - A name for logging purposes.
         * @returns {boolean} True if click was dispatched successfully, false otherwise.
         */
        function simulateClick(element, elementNameForLog = 'Element') {
             if (!(element instanceof Element)) { // More robust check
                 console.warn(`Cannot click: Invalid element provided for ${elementNameForLog}.`);
                 return false;
             }
             // Check if element is actually interactable in the DOM (basic check)
             if (element.offsetParent === null && !['body', 'html'].includes(element.tagName.toLowerCase())) {
                // Note: offsetParent being null doesn't *always* mean invisible (e.g., fixed position)
                // but it's a common indicator for normally laid out elements.
                // Might need refinement if clicking 'position: fixed' elements fails.
                 console.warn(`Cannot click: ${elementNameForLog} seems to be hidden or detached (offsetParent is null). Element:`, element);
                // return false; // Decided against returning false here, will still try the click.
             }


             try {
                 if (typeof element.click === 'function') {
                     element.click();
                    // console.debug(`Clicked ${elementNameForLog} via .click()`);
                     return true;
                 } else {
                     // Fallback for elements without a .click method (less common for interactables)
                     console.debug(`No .click() method on ${elementNameForLog}, trying dispatchEvent.`);
                     const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                     if (element.dispatchEvent(event)) {
                         // console.debug(`Clicked ${elementNameForLog} via dispatchEvent.`);
                         return true;
                     } else {
                          console.warn(`dispatchEvent(click) returned false for ${elementNameForLog}.`);
                          return false; // Event was cancelled?
                     }
                 }
             } catch (e) {
                 console.error(`Error during click simulation for ${elementNameForLog}:`, e);
                 return false;
             }
        }

        // Expose public functions
        return {
            sleepRandom,
            simulateClick
        };

    })(); // End inner IIFE

    console.log("Loaded: utils.js");
})(); // End outer IIFE