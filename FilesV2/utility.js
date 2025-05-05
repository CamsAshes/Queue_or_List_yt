/* eslint-disable no-console */
// --- utils.js ---
// Contains general utility functions for the script.

(function UtilsModule() {
  // Ensure the global namespace exists
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  // Avoid redefining if already loaded
  if (ns.Utils) {
    console.log('Utils module already defined.');
    return;
  }

  console.log('Defining: Utils Module');
  ns.Utils = (() => {
    // Immediately invoked function expression (IIFE) to encapsulate
    /**
     * Pauses execution for a specified time, adding randomness.
     * @param {number} baseDelayMs - The base time to wait in milliseconds.
     * @param {number} [randomnessPercent=0] - Percentage (0-100) of baseDelayMs to add as max random delay.
     * @returns {Promise<void>} A promise that resolves after the delay.
     */
    function sleepRandom(baseDelayMs, randomnessPercent = 0) {
      // Validate inputs
      let validBaseDelay = baseDelayMs;
      if (typeof validBaseDelay !== 'number' || validBaseDelay < 0) {
        console.warn(`Invalid baseDelayMs (${baseDelayMs}), using 100ms.`);
        validBaseDelay = 100;
      }
      let validRandomPercent = randomnessPercent;
      if (typeof validRandomPercent !== 'number' || validRandomPercent < 0) {
        validRandomPercent = 0;
      }

      // Calculate random addition
      let randomAdditionalMs = 0;
      if (validRandomPercent > 0) {
        const maxAdditional =
          validBaseDelay * (Math.min(100, validRandomPercent) / 100.0);
        randomAdditionalMs = Math.random() * maxAdditional;
      }

      // Calculate total wait time
      const totalWait = Math.round(validBaseDelay + randomAdditionalMs);
      // console.debug(`Utils.sleepRandom: Waiting ${totalWait}ms (Base: ${validBaseDelay}, Random: ${Math.round(randomAdditionalMs)}ms)`); // Uncomment for debugging

      // Return the promise
      return new Promise((resolve) => {
        setTimeout(resolve, totalWait);
      });
    }

    /**
     * Simulates a click event on a DOM element.
     * Attempts standard .click() first, falls back to dispatchEvent.
     * @param {Element | null} element - The DOM element to click.
     * @param {string} [elementNameForLog='Element'] - A descriptive name for logging purposes.
     * @returns {boolean} True if click was dispatched successfully, false otherwise.
     */
    function simulateClick(element, elementNameForLog = 'Element') {
      if (!(element instanceof Element)) {
        console.warn(
          `Utils.simulateClick: Invalid element provided for ${elementNameForLog}.`
        );
        return false;
      }
      // Basic visibility check (heuristic)
      if (
        element.offsetParent === null &&
        !['body', 'html'].includes(element.tagName.toLowerCase())
      ) {
        console.warn(
          `Utils.simulateClick: Target ${elementNameForLog} might be hidden (offsetParent is null). Attempting click anyway.`,
          element
        );
      }
      try {
        // Prefer the native click method if available
        if (typeof element.click === 'function') {
          element.click();
          // console.debug(`Utils.simulateClick: Clicked ${elementNameForLog} via .click()`); // Uncomment for debugging
          return true;
        }
        // Fallback for elements without .click (e.g., some SVG elements)
        console.debug(
          `Utils.simulateClick: No .click() on ${elementNameForLog}, trying dispatchEvent.`
        );
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        return element.dispatchEvent(event);
      } catch (e) {
        console.error(
          `Utils.simulateClick: Error during click simulation for ${elementNameForLog}:`,
          e
        );
        return false;
      }
    }

    // Expose public functions for this module
    return {
      sleepRandom,
      simulateClick,
    };
  })(); // End of IIFE for Utils module
})(); // End of wrapper IIFE
