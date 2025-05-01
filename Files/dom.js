// --- youtube_dom.js ---
(function() {
    "use strict";
    console.log("Loading: youtube_dom.js");

     if (window.ytBulkActionsDOM) {
        console.log("DOM module already defined.");
        return;
    }

    window.ytBulkActionsDOM = (function() {
        "use strict";

        // --- Selectors (Keep these easily updatable!) ---
        const SELECTORS = {
            appContainer: 'ytd-app',
            videoListContainer: '#contents.style-scope.ytd-playlist-video-list-renderer', // Container for videos
            videoRenderer: 'ytd-playlist-video-renderer',
            continuationItem: 'ytd-continuation-item-renderer',
            continuationSpinner: 'ytd-continuation-item-renderer tp-yt-paper-spinner[active]',
            // Inside Video Renderer
            titleLink: 'a#video-title',
            titleH3: 'h3.style-scope.ytd-playlist-video-renderer',
            durationBadge: '#thumbnail ytd-thumbnail-overlay-time-status-renderer div.badge-shape-wiz__text',
            videoInfoContainer: '#video-info', // Container for views/date spans
            videoInfoSpan: '#video-info > span.style-scope.yt-formatted-string',
            menuContainer: '#menu',
            menuButton: '#menu yt-icon-button#button, #menu button', // Look for button inside #menu
            // Popups / Dialogs
            popupContainer: 'ytd-popup-container', // Primary container for popups
            genericMenuItem: 'ytd-menu-service-item-renderer',
            genericMenuItemPaperItem: 'tp-yt-paper-item', // Often the clickable part within the renderer
            genericMenuItemText: 'yt-formatted-string',
            addToQueueText: 'Add to queue',
            saveToPlaylistText: 'Save to playlist',
            saveToPlaylistDialog: 'ytd-add-to-playlist-renderer', // Dialog after clicking "Save to playlist"
            newPlaylistButton: 'ytd-add-to-playlist-renderer button.yt-spec-button-shape-next[aria-label="New playlist"]',
            createPlaylistDialog: 'yt-create-playlist-dialog-view-model', // Specific tag for the create dialog content
            playlistNameInput: 'yt-create-playlist-dialog-form-view-model textarea.ytStandardsTextareaShapeTextarea',
            visibilityDropdownTrigger: 'yt-create-playlist-dialog-form-view-model dropdown-view-model div[role="combobox"]',
            visibilityDropdownPopup: 'tp-yt-iron-dropdown', // The dropdown popup itself
            visibilityOptionItem: 'tp-yt-paper-item, yt-list-item-view-model', // Items inside the dropdown
            createPlaylistSubmitButton: 'yt-create-playlist-dialog-form-view-model button.yt-spec-button-shape-next[aria-label="Create"]'
        };

        /**
         * Finds a specific menu item popup by its text content, ensuring it's visible.
         * @param {string} textContent - The exact text to match.
         * @returns {Element | null} The clickable menu item element or null.
         */
        function findMenuItemByText(textContent) {
            // Query all potential menu items currently in the DOM
             const menuItems = document.querySelectorAll(SELECTORS.genericMenuItem);
             for (const item of menuItems) {
                 // Check visibility using offsetParent (simplest check)
                 if (item.offsetParent !== null) {
                     const textElement = item.querySelector(SELECTORS.genericMenuItemText);
                     if (textElement && textElement.textContent?.trim() === textContent) {
                         // Return the paper-item inside, as that's usually the clickable target in menus
                         const clickablePart = item.querySelector(SELECTORS.genericMenuItemPaperItem) || item;
                         return clickablePart;
                     }
                 }
             }
            console.warn(`Could not find *visible* menu item with text: "${textContent}"`);
            return null;
        }

        /**
         * Finds an element likely within a currently *visible* dialog/popup.
         * @param {string} selector - The CSS selector for the target element.
         * @param {string} selectorNameForLog - A descriptive name for logging.
         * @returns {Element | null}
         */
        function findElementInDialog(selector, selectorNameForLog = 'Element') {
             // Query globally first, then check visibility
             const elements = document.querySelectorAll(selector);
             for (const element of elements) {
                  // Check visibility robustly: must have size and not be hidden by parents
                  const rect = element.getBoundingClientRect();
                  const style = window.getComputedStyle(element);
                  if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0' && style.display !== 'none') {
                       // Check if it's inside a potentially visible dialog structure
                       if (element.closest(SELECTORS.saveToPlaylistDialog + ', ' + SELECTORS.createPlaylistDialog + ', ' + SELECTORS.popupContainer + ' tp-yt-paper-dialog:not([aria-hidden="true"])' + ', ' + 'ytd-popup-container tp-yt-iron-dropdown:not([aria-hidden="true"])' )) {
                           console.debug(`Found visible ${selectorNameForLog} inside a dialog structure.`);
                           return element;
                       }
                  }
             }
            console.warn(`Could not find visible ${selectorNameForLog} within expected dialog structures using selector: ${selector}`);
            return null;
        }

        /**
         * Specifically finds a visibility option (Public/Unlisted/Private) *after* the dropdown has been opened.
         * @param {string} optionText - 'Public', 'Unlisted', or 'Private'.
         * @returns {Element | null} The clickable list item element.
         */
        function findVisibilityOption(optionText) {
            const openDropdowns = document.querySelectorAll(
                 `${SELECTORS.popupContainer} ${SELECTORS.visibilityDropdownPopup}:not([aria-hidden="true"]),
                 ${SELECTORS.visibilityDropdownPopup}:not([aria-hidden="true"])` // Global fallback
             );

            for (const dropdown of openDropdowns) {
                 if (dropdown.offsetParent === null) continue; // Skip hidden dropdowns

                 const options = dropdown.querySelectorAll(SELECTORS.visibilityOptionItem);
                 for (const option of options) {
                      // Check the main text content of the option
                      const titleElement = option.querySelector('.yt-list-item-view-model-wiz__title, tp-yt-paper-item'); // Adjust selector based on actual structure of items
                      if (titleElement && titleElement.textContent?.trim() === optionText) {
                          return option; // Return the whole item, click simulation should handle it
                      }
                 }
            }

            console.warn(`Could not find visible visibility option "${optionText}" in any open dropdown.`);
            return null;
        }


        // --- Public Methods ---
        return {
            SELECTORS,
            findMenuItemByText,
            findElementInDialog,
            findAddToQueueButton: () => findMenuItemByText(SELECTORS.addToQueueText),
            findSaveToPlaylistButton: () => findMenuItemByText(SELECTORS.saveToPlaylistText),
            findNewPlaylistButton: () => findElementInDialog(SELECTORS.newPlaylistButton, '"New Playlist" Button'),
            findPlaylistNameInput: () => findElementInDialog(SELECTORS.playlistNameInput, 'Playlist Name Input'),
            findVisibilityTrigger: () => findElementInDialog(SELECTORS.visibilityDropdownTrigger, 'Visibility Dropdown Trigger'),
            findVisibilityOption, // Expose the specific function
            findCreatePlaylistSubmitButton: () => findElementInDialog(SELECTORS.createPlaylistSubmitButton, '"Create" Playlist Button')
        };

    })(); // End inner IIFE

    console.log("Loaded: youtube_dom.js");
})(); // End outer IIFE