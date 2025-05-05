/* eslint-disable no-console */
// --- ui.js ---
// Handles finding and manipulating elements within the pre-injected modal UI.
// Assumes the HTML structure from modal.html has been injected into the DOM
// and styles from style.css have been applied (e.g., by the loader script).

(function ytBulkActionsUI() {
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  if (ns.UI) {
    console.log('UI module already defined.');
    return;
  }

  console.log('Defining: UI Module (for pre-injected HTML)');
  ns.UI = (() => {
    // --- Constants (Must match IDs/Classes in modal.html) ---
    const MODAL_ID = 'yt-bulk-action-modal';
    const OVERLAY_ID = 'yt-bulk-action-overlay';
    const PAGE1_ID = 'yt-bulk-action-page1';
    const PAGE2_ID = 'yt-bulk-action-page2';
    const VIDEO_LIST_ID = 'yt-bulk-action-video-list';
    const SEARCH_INPUT_ID = 'yt-bulk-action-search';
    const STATUS_AREA_ID = 'yt-bulk-action-status';
    const VIDEO_ITEM_CLASS = 'yt-bulk-action-video-item';
    const MODAL_CONTAINER_ID = 'yt-bulk-modal-container'; // ID of the div holding injected HTML

    // --- State ---
    let modalElementsCache = null; // Cache for found elements

    // --- Helper Functions ---

    /** Creates a DOM element - Used for dynamic list items */
    function createStyledElement(
      tag,
      styles = {},
      attributes = {},
      textContent = ''
    ) {
      const el = document.createElement(tag);
      Object.assign(el.style, styles);
      Object.entries(attributes).forEach(([key, value]) =>
        el.setAttribute(key, value)
      );
      if (textContent) el.textContent = textContent;
      return el;
    }

    // --- Core UI Functions ---

    /**
     * Finds and caches references to the main modal elements after HTML injection.
     * MUST be called after the loader script has injected modal.html.
     * Returns the cached object or null if essential elements aren't found.
     */
    function getElements() {
      if (modalElementsCache) {
        return modalElementsCache;
      }

      console.log('UI: Querying DOM for modal elements...');
      // Assume the loader injected HTML into a div with MODAL_CONTAINER_ID
      const container = document.getElementById(MODAL_CONTAINER_ID);
      if (!container) {
        console.error(
          `UI Error: Modal container (#${MODAL_CONTAINER_ID}) not found.`
        );
        return null;
      }

      const elements = {
        overlay: container.querySelector(`#${OVERLAY_ID}`),
        modal: container.querySelector(`#${MODAL_ID}`),
        page1: container.querySelector(`#${PAGE1_ID}`),
        page2: container.querySelector(`#${PAGE2_ID}`),
        videoList: container.querySelector(`#${VIDEO_LIST_ID}`),
        searchInput: container.querySelector(`#${SEARCH_INPUT_ID}`),
        configureButton: container.querySelector('#configure-button'),
        backButton: container.querySelector('#back-button'),
        runButton: container.querySelector('#run-button'),
        statusArea: container.querySelector(`#${STATUS_AREA_ID}`),
        delayInputs: {}, // Populated below
        randomnessInput: container.querySelector('#delay-randomness-percent'),
        actionRadios: {}, // Populated below
        sortRadios: {}, // Populated below
        playlistNameInput: container.querySelector('#playlist-name-input'),
        visibilitySelect: container.querySelector(
          '#playlist-visibility-select'
        ),
        playlistConfigDiv: container.querySelector('#playlist-config'),
        selectAllCheckbox: container.querySelector(
          '#yt-bulk-action-select-all'
        ),
        selectNoneButton: container.querySelector(
          '#yt-bulk-action-select-none'
        ),
        // Add references to the close buttons if needed by other functions
        closeButton1: container.querySelector(
          `#${PAGE1_ID} button.close-button`
        ),
        closeButton2: container.querySelector(
          `#${PAGE2_ID} button.close-button`
        ),
      };

      // --- Populate dynamic element references ---
      // Delays (Assuming inputs exist in modal.html with correct IDs)
      const delayKeys = Object.keys(ns.config?.DEFAULT_DELAYS || {});
      delayKeys.forEach((key) => {
        const inputId = `delay-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`; // Convert camelCase to kebab-case
        elements.delayInputs[key] = container.querySelector(`#${inputId}`);
        if (!elements.delayInputs[key])
          console.warn(`UI Warning: Delay input #${inputId} not found.`);
      });

      // Actions (Assuming radios exist in modal.html)
      ['add_to_queue', 'add_to_new_playlist'].forEach((val) => {
        elements.actionRadios[val] = container.querySelector(`#action-${val}`);
        if (!elements.actionRadios[val])
          console.warn(`UI Warning: Action radio #action-${val} not found.`);
      });

      // Sort (Assuming radios exist in modal.html)
      ['oldest_first', 'newest_first'].forEach((val) => {
        elements.sortRadios[val] = container.querySelector(`#sort-${val}`);
        if (!elements.sortRadios[val])
          console.warn(`UI Warning: Sort radio #sort-${val} not found.`);
      });

      // --- Validate essential elements ---
      const essentialFound =
        elements.overlay &&
        elements.modal &&
        elements.page1 &&
        elements.page2 &&
        elements.videoList &&
        elements.statusArea &&
        elements.runButton;
      if (!essentialFound) {
        console.error(
          'UI Error: One or more essential modal elements could not be found after HTML injection.'
        );
        modalElementsCache = null; // Ensure cache is cleared on failure
        return null;
      }

      modalElementsCache = elements; // Cache found elements
      console.log('UI: Modal elements found and cached.');
      return modalElementsCache;
    }

    /** Removes the modal container from the DOM and resets state. */
    function removeModal() {
      // Request stop before removing UI
      if (ns.Main && typeof ns.Main.stopExecution === 'function') {
        ns.Main.stopExecution();
      } else if (ns) {
        ns.stopRequested = true; // Set flag directly as fallback
      }

      document.getElementById(MODAL_CONTAINER_ID)?.remove(); // Remove the container
      modalElementsCache = null; // Clear cache
      if (ns) {
        ns.isRunning = false;
        ns.actionsRunning = false;
      }
      console.log('UI: Modal container removed.');
    }

    /** Shows the specified page (div) and hides the other. */
    function showPage(pageId) {
      const elements = getElements(); // Get (potentially cached) elements
      if (!elements) return;
      if (elements.page1)
        elements.page1.style.display = pageId === PAGE1_ID ? 'flex' : 'none';
      if (elements.page2)
        elements.page2.style.display = pageId === PAGE2_ID ? 'flex' : 'none';
    }

    /** Creates and appends a single video item row to the list element. */
    function addVideoToList(videoData, videoIndex, listElement) {
      const entryDiv = createStyledElement(
        'div',
        {},
        { class: VIDEO_ITEM_CLASS, 'data-video-index': videoIndex }
      );
      const checkbox = createStyledElement(
        'input',
        {},
        { type: 'checkbox', 'data-video-index': videoIndex, checked: true }
      );
      const detailsDiv = createStyledElement('div', {}, { class: 'details' });
      const titleSpan = createStyledElement(
        'span',
        {},
        { class: 'video-title', title: videoData.title },
        videoData.title || 'Unknown Title'
      );
      const metaSpan = createStyledElement(
        'span',
        {},
        { class: 'video-meta' },
        `${videoData.duration || '?'}  •  ${videoData.uploadDate || '?'}`
      );
      detailsDiv.append(titleSpan, metaSpan);
      entryDiv.append(checkbox, detailsDiv);
      listElement.appendChild(entryDiv);
      entryDiv.ytBulkData = {
        menuButtonElement: videoData.menuButtonElement,
        title: videoData.title,
        originalIndex: videoData.originalIndex,
      };
    }

    /** Updates the status message text area. */
    function updateStatus(message, isError = false) {
      const elements = getElements(); // Use getElements to ensure they are found
      if (elements && elements.statusArea) {
        elements.statusArea.textContent = message;
        elements.statusArea.style.color = isError ? '#ff8a8a' : '#aaa';
      }
      if (isError) console.error('UI Status:', message);
      else console.info('UI Status:', message);
    }

    /** Adds/removes CSS classes to indicate video item processing status. */
    function updateListItemStatus(itemDiv, status) {
      if (!itemDiv || !(itemDiv instanceof HTMLElement)) return;
      const updateItem = itemDiv instanceof HTMLElement ? itemDiv : null;
      updateItem.classList.remove(
        'yt-bulk-item-processing',
        'yt-bulk-item-done',
        'yt-bulk-item-failed'
      );
      const checkbox = updateItem.querySelector('input[type="checkbox"]');
      switch (status) {
        case 'processing':
          updateItem.classList.add('yt-bulk-item-processing');
          updateItem.style.opacity = '0.7';
          if (checkbox) checkbox.disabled = true;
          break;
        case 'done':
          updateItem.classList.add('yt-bulk-item-done');
          updateItem.style.opacity = '0.4';
          if (checkbox) checkbox.disabled = true;
          break;
        case 'failed':
          updateItem.classList.add('yt-bulk-item-failed');
          updateItem.style.opacity = '0.6';
          if (checkbox) checkbox.disabled = false;
          break;
        case 'reset':
        default:
          updateItem.style.opacity = '1';
          if (checkbox) checkbox.disabled = false;
          break;
      }
    }

    /** Updates the state of the Select All checkbox based on visible items. */
    function updateSelectAllCheckboxState() {
      const elements = getElements();
      if (!elements || !elements.videoList || !elements.selectAllCheckbox)
        return;
      const visibleItems = Array.from(elements.videoList.children).filter(
        (el) =>
          el.matches(`.${VIDEO_ITEM_CLASS}`) && el.style.display !== 'none'
      );
      if (visibleItems.length === 0) {
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = false;
        return;
      }
      let allChecked = true;
      let noneChecked = true;
      visibleItems.forEach((item) => {
        const cb = item.querySelector('input[type="checkbox"]');
        if (!cb || !cb.checked) allChecked = false;
        if (cb?.checked) noneChecked = false;
      });
      if (allChecked) {
        elements.selectAllCheckbox.checked = true;
        elements.selectAllCheckbox.indeterminate = false;
      } else if (noneChecked) {
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = false;
      } else {
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = true;
      }
    }

    /** Clears and populates the video list in the modal. */
    function populateVideoList(videoDataArray) {
      const elements = getElements();
      if (!elements || !elements.videoList) {
        console.error('UI: Cannot populate list, list element missing.');
        return;
      }
      // Clear list safely
      while (elements.videoList.firstChild) {
        elements.videoList.removeChild(elements.videoList.firstChild);
      }
      videoDataArray.forEach((video, index) =>
        addVideoToList(video, index, elements.videoList)
      );
      updateSelectAllCheckboxState();
      console.log(`UI: Populated list with ${videoDataArray.length} videos.`);
    }

    /** Filters the video list based on the search term. */
    function filterList(searchTerm) {
      const elements = getElements();
      if (!elements || !elements.videoList) return;
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      const items = elements.videoList.querySelectorAll(`.${VIDEO_ITEM_CLASS}`);
      let visibleCount = 0;
      items.forEach((itemDiv) => {
        const checkItem = itemDiv instanceof HTMLElement ? itemDiv : null;
        if (!checkItem) return;
        const title = checkItem.ytBulkData?.title?.toLowerCase() || '';
        const isVisible = !lowerSearchTerm || title.includes(lowerSearchTerm);
        checkItem.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount += 1;
      });
      updateSelectAllCheckboxState();
      console.log(`UI: Filter applied. ${visibleCount} items visible.`);
    }

    /** Checks or unchecks all *visible* video item checkboxes. */
    function toggleAllVisible(checkedState) {
      const elements = getElements();
      if (!elements || !elements.videoList) return;
      const visibleItems = elements.videoList.querySelectorAll(
        `.${VIDEO_ITEM_CLASS}:not([style*="display: none"])`
      );
      visibleItems.forEach((item) => {
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = checkedState;
      });
      updateSelectAllCheckboxState();
    }

    // --- Expose Public Methods & Constants ---
    return {
      removeModal,
      showPage,
      populateVideoList,
      filterList,
      updateStatus,
      updateListItemStatus,
      getElements, // Finds elements in existing DOM
      updateSelectAllCheckboxState,
      toggleAllVisible,
      // Constants needed by Main module
      PAGE1_ID,
      PAGE2_ID,
      VIDEO_ITEM_CLASS,
      VIDEO_LIST_ID,
      SEARCH_INPUT_ID,
      MODAL_CONTAINER_ID,
    };
  })(); // End of IIFE for UI module
})(); // End of wrapper IIFE
