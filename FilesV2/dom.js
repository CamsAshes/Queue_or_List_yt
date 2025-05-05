/* eslint-disable no-console */
// --- dom.js ---
// Contains selectors and functions for finding specific YouTube DOM elements.

(function ytBulkActionsWrapper() {
  // Ensure the global namespace exists
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  // Avoid redefining if already loaded
  if (ns.DOM) {
    console.log('DOM module already defined.');
    return;
  }

  console.log('Defining: DOM Module');
  ns.DOM = (() => {
    // IIFE for encapsulation
    // --- Selectors ---
    // Keep these updated based on YouTube's structure changes!
    const SELECTORS = {
      // Video items in various list formats
      videoRendererGeneric:
        'ytd-playlist-video-renderer, ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer',
      // Infinite scroll elements
      continuationItem: 'ytd-continuation-item-renderer',
      continuationSpinner:
        'ytd-continuation-item-renderer tp-yt-paper-spinner[active]',
      // Elements within a video renderer
      titleElement:
        '#video-title, #title-wrapper .title-and-badge a #video-title', // Includes link text fallback
      thumbnailLink: 'a#thumbnail', // Often contains video URL/ID
      durationBadge:
        '#thumbnail-overlay-time-status-renderer span#text, ytd-thumbnail-overlay-time-status-renderer div.badge-shape-wiz__text', // Common duration elements
      videoInfoContainer: '#metadata-line, #meta #metadata-line', // Where views/date usually live
      videoInfoString: 'yt-formatted-string#video-info', // Fallback container for date/views
      videoInfoSpan:
        '#metadata-line > span.inline-metadata-item, #metadata-line > span.ytd-video-meta-block', // Specific spans in metadata line
      menuContainer: '#menu', // Container for the 3-dot button
      menuButton: '#menu button#button, #menu yt-icon-button', // The 3-dot button itself
      // Popup menus and dialogs
      popupContainer:
        'ytd-popup-container, tp-yt-iron-dropdown.ytd-popup-container', // Main popup wrapper
      genericMenuPopup: 'ytd-menu-popup-renderer', // Often holds menu items
      genericMenuItem: 'ytd-menu-service-item-renderer, tp-yt-paper-item', // Individual menu actions or list items
      genericMenuItemText: 'yt-formatted-string, .item-text', // Text within a menu item
      // Specific menu item texts (case-sensitive)
      addToQueueText: 'Add to queue',
      saveToPlaylistText: 'Save to playlist',
      // "Save to playlist" dialog elements
      saveToPlaylistDialog: 'ytd-add-to-playlist-renderer', // The dialog container
      saveToPlaylistDialogCheckboxes: 'ytd-playlist-add-to-option-renderer', // Rows for each playlist
      saveToPlaylistDialogCheckboxLabel: '#label', // Label within a playlist row
      saveToPlaylistDialogCheckboxInput: 'tp-yt-paper-checkbox#checkbox', // The actual checkbox input
      saveToPlaylistDialogCloseButton: '#header #close-button', // Close button for this dialog
      newPlaylistButton:
        'ytd-add-to-playlist-renderer button[aria-label="New playlist"], ytd-add-to-playlist-renderer button[aria-label="Create new playlist"], ytd-add-to-playlist-renderer #create-playlist-button', // Variations of the "New playlist" button
      // "Create new playlist" dialog elements
      createPlaylistDialog:
        'yt-create-playlist-dialog-view-model, ytd-playlist-dialog-renderer', // Container for the create form
      playlistNameInput:
        'tp-yt-paper-dialog textarea.ytStandardsTextareaShapeTextarea, yt-dialog-view-model textarea.ytStandardsTextareaShapeTextarea', // Text area for name
      visibilityDropdownTrigger: `yt-create-playlist-dialog-form-view-model div.ytDropdownViewModelDropdownContainer[role="combobox"],
                                        ytd-add-to-playlist-renderer div.ytDropdownViewModelDropdownContainer[role="combobox"],
                                        tp-yt-paper-dialog div.ytDropdownViewModelDropdownContainer[role="combobox"]`, // The clickable area to open visibility options
      visibilityDropdownPopup: 'tp-yt-iron-dropdown:not([aria-hidden="true"])', // The dropdown menu itself when open
      visibilityOptionItem: 'tp-yt-paper-item, yt-list-item-view-model', // Individual items (Public/Unlisted/Private) in the dropdown
      // Submit button for creating the new playlist
      createPlaylistSubmitButton: `yt-form-footer-view-model button.yt-spec-button-shape-next--filled[aria-label="Create"],
                                        yt-create-playlist-dialog-form-view-model button[aria-label="Create"],
                                        tp-yt-paper-dialog button.yt-spec-button-shape-next--filled[aria-label="Create"]`,
    };

    /**
     * Finds a specific menu item popup by its exact text content, ensuring it's visible.
     * Searches globally as menus often appear detached from their trigger.
     * @param {string} textContent - The exact text to match.
     * @returns {Element | null} The clickable menu item element or null.
     */
    function findMenuItemByText(textContent) {
      // Search all potential menu item renderers and paper-items
      const menuItems = Array.from(
        document.querySelectorAll(SELECTORS.genericMenuItem)
      );
      const item = menuItems.find((menuItem) => {
        // Basic visibility check (must have size and be in the layout)
        if (
          menuItem.offsetParent !== null &&
          menuItem.getBoundingClientRect().height > 0
        ) {
          const textElement = menuItem.querySelector(
            SELECTORS.genericMenuItemText
          );
          // Check if the text content matches exactly
          return textElement && textElement.textContent?.trim() === textContent;
        }
        return false;
      });

      if (item) {
        // Return the most likely clickable element (paper-item or the renderer itself)
        return item.matches('tp-yt-paper-item')
          ? item
          : item.querySelector('tp-yt-paper-item') || item;
      }

      console.warn(`DOM: Could not find visible menu item: "${textContent}"`);
      return null;
    }

    /**
     * Finds an element expected to be within a currently *visible* dialog/popup.
     * Checks size and computed visibility styles.
     * @param {string} selector - The CSS selector for the target element.
     * @param {string} [selectorNameForLog='Element'] - A descriptive name for logging.
     * @returns {Element | null} The found element or null.
     */
    function findElementInDialog(selector, selectorNameForLog = 'Element') {
      const elements = Array.from(document.querySelectorAll(selector));
      const element = elements.find((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        // Check if potentially visible and physically present
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          style.display !== 'none'
        ) {
          // Check if it's nested within a known, currently visible dialog/popup structure
          return el.closest(
            `${SELECTORS.saveToPlaylistDialog}:not([hidden]), ${SELECTORS.createPlaylistDialog}:not([hidden]), ${SELECTORS.genericMenuPopup}:not([hidden]), ${SELECTORS.popupContainer} tp-yt-paper-dialog:not([aria-hidden="true"]), ${SELECTORS.popupContainer} ${SELECTORS.visibilityDropdownPopup}`
          );
        }
        return false;
      });

      if (element) {
        console.debug(`DOM: Found visible ${selectorNameForLog} in dialog.`);
        return element;
      }

      console.warn(
        `DOM: Could not find visible ${selectorNameForLog} in dialog structures using selector: ${selector}`
      );
      return null;
    }

    /**
     * Finds a specific visibility option (e.g., 'Public', 'Unlisted', 'Private')
     * *after* the visibility dropdown has been opened.
     * @param {string} optionText - The starting text of the option to find.
     * @returns {Element | null} The clickable list item element.
     */
    function findVisibilityOption(optionText) {
      // Find potentially open dropdowns
      const openDropdowns = Array.from(
        document.querySelectorAll(SELECTORS.visibilityDropdownPopup)
      );
      const dropdown = openDropdowns.find(
        (dropdownEl) => dropdownEl.offsetParent !== null
      );

      if (!dropdown) {
        console.warn(
          `DOM: Could not find visible visibility option starting with "${optionText}"`
        );
        return null;
      }

      // Find items within the dropdown
      const options = Array.from(
        dropdown.querySelectorAll(SELECTORS.visibilityOptionItem)
      );
      const option = options.find((opt) => {
        const textContent = opt
          .querySelector(
            '.yt-list-item-view-model-wiz__title, .item-text, yt-formatted-string'
          )
          ?.textContent?.trim();
        return textContent && textContent.startsWith(optionText);
      });

      if (option) {
        return option;
      }

      console.warn(
        `DOM: Could not find visible visibility option starting with "${optionText}"`
      );
      return null;
    }

    // --- Expose public functions and selectors ---
    return {
      SELECTORS,
      findMenuItemByText,
      findElementInDialog,
      findVisibilityOption,
      // Specific finders built on the helpers:
      findAddToQueueButton: () => findMenuItemByText(SELECTORS.addToQueueText),
      findSaveToPlaylistButton: () =>
        findMenuItemByText(SELECTORS.saveToPlaylistText),
      findNewPlaylistButton: () =>
        findElementInDialog(
          SELECTORS.newPlaylistButton,
          '"New Playlist" Button'
        ),
      findPlaylistNameInput: () =>
        findElementInDialog(SELECTORS.playlistNameInput, 'Playlist Name Input'),
      findVisibilityTrigger: () =>
        findElementInDialog(
          SELECTORS.visibilityDropdownTrigger,
          'Visibility Dropdown Trigger'
        ),
      findCreatePlaylistSubmitButton: () =>
        findElementInDialog(
          SELECTORS.createPlaylistSubmitButton,
          '"Create" Playlist Button'
        ),
      // Added finder for the close button on the "Save to..." dialog
      findSavePlaylistDialogCloseButton: () =>
        findElementInDialog(
          SELECTORS.saveToPlaylistDialogCloseButton,
          '"Save to Playlist" Dialog Close'
        ),
    };
  })(); // End of IIFE for DOM module
})(); // End of wrapper IIFE
