/* eslint-disable no-alert */
/* eslint-disable no-console */
// --- ui.js ---
// Handles the creation, display, and manipulation of the modal user interface.

(function ytBulkActionsUI() {
  // Ensure the global namespace exists
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  // Avoid redefining if already loaded
  if (ns.UI) {
    console.log('UI module already defined.');
    return;
  }

  // --- Dependency Check (Optional but good practice) ---
  // This module primarily creates elements, but might implicitly rely on ns flags
  // No hard dependencies on Utils/DOM/Actions for *creation*, only for *event handlers* (which are in Main)

  console.log('Defining: UI Module');
  ns.UI = (() => {
    // IIFE for encapsulation
    // --- Constants ---
    const MODAL_ID = 'yt-bulk-action-modal';
    const OVERLAY_ID = 'yt-bulk-action-overlay';
    const PAGE1_ID = 'yt-bulk-action-page1';
    const PAGE2_ID = 'yt-bulk-action-page2';
    const VIDEO_LIST_ID = 'yt-bulk-action-video-list';
    const SEARCH_INPUT_ID = 'yt-bulk-action-search';
    const STATUS_AREA_ID = 'yt-bulk-action-status';
    const VIDEO_ITEM_CLASS = 'yt-bulk-action-video-item';
    const STYLE_ID = 'yt-bulk-action-styles'; // ID for injected stylesheet

    // --- State ---
    // Stores references to key DOM elements for easy access
    let modalElements = {}; // Reset in createModalStructure

    // --- Data ---
    const VISIBILITY_DESCRIPTIONS = {
      Public: 'Anyone can search/view',
      Unlisted: 'Anyone with link can view',
      Private: 'Only you can view',
    };

    // --- Helper Functions ---

    /**
     * Creates a DOM element with specified styles, attributes, and text content.
     * @param {string} tag - The HTML tag name.
     * @param {object} [styles={}] - An object of CSS styles.
     * @param {object} [attributes={}] - An object of HTML attributes.
     * @param {string} [textContent=''] - The text content for the element.
     * @returns {HTMLElement} The created element.
     */
    function createStyledElement(
      tag,
      styles = {},
      attributes = {},
      textContent = ''
    ) {
      const el = document.createElement(tag);
      Object.assign(el.style, styles); // Apply styles directly
      Object.entries(attributes).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
      if (textContent) {
        el.textContent = textContent;
      }
      return el;
    }

    /** Creates a label and number input pair for delay settings. */
    function createDelayInput(id, labelText, defaultValue) {
      const container = createStyledElement('div', { marginBottom: '8px' });
      const label = createStyledElement(
        'label',
        {
          display: 'block',
          marginBottom: '4px',
          fontSize: '12px',
          color: '#aaa',
        },
        { for: id },
        `${labelText}:`
      );
      const input = createStyledElement(
        'input',
        {
          width: '70px',
          padding: '4px',
          borderRadius: '3px',
          border: '1px solid #666',
          backgroundColor: '#111',
          color: '#eee',
          fontSize: '12px',
          marginLeft: '5px',
        },
        { type: 'number', id, value: defaultValue, min: '0', step: '50' }
      );
      container.append(label, input);
      return { container, input };
    }

    /** Injects CSS styles into the document head if not already present. */
    function injectStyles() {
      if (!document.getElementById(STYLE_ID)) {
        const styleSheet = document.createElement('style');
        styleSheet.id = STYLE_ID;
        // CSS rules matching the classes used below
        styleSheet.textContent = `
                    #${OVERLAY_ID} { position:fixed; inset:0px; background-color:rgba(0,0,0,0.85); z-index:25000; display:flex; align-items:center; justify-content:center; font-family:"Roboto", Arial, sans-serif; }
                    #${MODAL_ID} { background-color:#212121; color:#eee; padding:0; border-radius:8px; z-index:25001; width:85%; max-width:850px; height:90vh; display:flex; flex-direction:column; border:1px solid #555; overflow:hidden; }
                    #${PAGE1_ID}, #${PAGE2_ID} { display:flex; flex-direction:column; height:100%; padding:15px 20px; box-sizing:border-box; }
                    .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-shrink:0; }
                    .modal-header h2 { margin:0; font-size:18px; color:#f1f1f1; font-weight:500; flex-grow:1; text-align:left; }
                    #page2-header h2 { text-align:center; margin:0 auto; }
                    .modal-header input[type="search"] { padding:8px 10px; margin-left:20px; flex-grow:1; max-width:400px; border-radius:4px; border:1px solid #555; background-color:#121212; color:#eee; font-size:14px; }
                    .modal-header button.close-button { background:none; border:none; color:#aaa; font-size:24px; cursor:pointer; line-height:1; padding:0 5px; margin-left:15px; }
                    #yt-bulk-action-selection-controls { display:flex; margin-bottom:10px; align-items:center; padding-left:5px; justify-content:space-between; }
                    #yt-bulk-action-selection-controls label { display:flex; align-items:center; cursor:pointer; font-size:13px; color:#aaa; }
                    #yt-bulk-action-selection-controls input[type="checkbox"] { margin-right:5px; accent-color:#3ea6ff; cursor:pointer; transform:scale(1.2); }
                    #yt-bulk-action-select-none { padding:4px 8px; font-size:12px; cursor:pointer; background-color:#555; border:none; border-radius:3px; color:#eee; margin-left:15px; }
                    #${VIDEO_LIST_ID} { flex-grow:1; overflow-y:auto; border:1px solid #383838; margin-bottom:10px; padding:5px; border-radius:4px; }
                    .${VIDEO_ITEM_CLASS} { display:flex; align-items:center; padding:6px 4px; border-bottom:1px solid #383838; font-size:13px; transition:background-color .3s ease,border-left .3s ease,opacity .3s ease; border-left:3px solid transparent!important; }
                    .${VIDEO_ITEM_CLASS}:last-child { border-bottom:none; }
                    .${VIDEO_ITEM_CLASS} input[type="checkbox"] { flex-shrink:0; margin-right:10px; cursor:pointer; width:16px; height:16px; accent-color:#3ea6ff; }
                    .${VIDEO_ITEM_CLASS} .details { display:flex; flex-direction:column; flex-grow:1; overflow:hidden; margin-right:10px; }
                    .${VIDEO_ITEM_CLASS} .video-title { font-weight:500; color:#f1f1f1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; display:block; line-height:1.3; }
                    .${VIDEO_ITEM_CLASS} .video-meta { font-size:12px; color:#aaa; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.3; }
                    .yt-bulk-item-processing { background-color:rgba(255,255,100,.1)!important; border-left-color:orange!important; opacity:0.7; }
                    .yt-bulk-item-done { background-color:rgba(100,255,100,.1)!important; border-left-color:limegreen!important; opacity:0.4; }
                    .yt-bulk-item-failed { background-color:rgba(255,100,100,.15)!important; border-left-color:red!important; opacity:0.6; }
                    .modal-footer { display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-shrink:0; padding-top:10px; border-top:1px solid #383838; }
                    #${STATUS_AREA_ID} { font-size:12px; color:#aaa; flex-grow:1; margin-right:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                    #configure-button { padding:8px 15px; cursor:pointer; background-color:#3ea6ff; color:#111; border:none; border-radius:4px; font-weight:500; }
                    #${PAGE2_ID} .modal-footer { justify-content:center; margin-top:15px; padding-top:15px; }
                    #${PAGE2_ID} .config-scroll-area { flex-grow:1; overflow-y:auto; padding-right:10px; }
                    #${PAGE2_ID} .config-section { border:1px solid #444; border-radius:4px; padding:15px; margin-bottom:15px; }
                    #${PAGE2_ID} .config-section h4 { margin:0 0 10px 0; text-align:center; font-size:14px; color:#ccc; font-weight:500; }
                    #${PAGE2_ID} .radio-group { display:flex; justify-content:space-around; flex-wrap:wrap; gap:15px; }
                    #${PAGE2_ID} .radio-group label { display:flex; align-items:center; cursor:pointer; font-size:14px; }
                    #${PAGE2_ID} .radio-group input[type="radio"] { margin-right:6px; cursor:pointer; accent-color:#3ea6ff; transform:scale(1.1); }
                    #playlist-config label { display:block; margin-bottom:4px; font-size:13px; color:#aaa; }
                    #playlist-name-input { width:calc(100% - 12px); padding:6px; border-radius:3px; border:1px solid #666; background-color:#111; color:#eee; font-size:13px; margin-bottom:12px; box-sizing:border-box; }
                    #playlist-visibility-select { width:100%; padding:6px; border-radius:3px; border:1px solid #666; background-color:#111; color:#eee; font-size:13px; cursor:pointer; }
                    #playlist-visibility-select option { padding:5px; background-color:#212121; }
                    #delay-config-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px 15px; }
                    #delay-config-grid > div { margin-bottom:8px; }
                    #delay-config-grid label { display:block; margin-bottom:4px; font-size:12px; color:#aaa; }
                    #delay-config-grid input[type="number"] { width:70px; padding:4px; border-radius:3px; border:1px solid #666; background-color:#111; color:#eee; font-size:12px; margin-left:5px; appearance:textfield; -moz-appearance:textfield; }
                    #back-button { padding:8px 15px; cursor:pointer; background-color:#666; color:white; border:none; border-radius:4px; margin-right:auto; }
                    #run-button { padding:10px 25px; cursor:pointer; background-color:#5fde5f; color:#111; border:none; border-radius:4px; font-size:16px; font-weight:bold; }
                    #run-button:disabled { background-color:#4a4a4a; cursor:not-allowed; }
                `;
        document.head.appendChild(styleSheet);
      }
    }

    // --- Public Methods ---

    /** Removes the modal from the DOM and resets UI state. */
    function removeModal() {
      // Request stop before removing UI (important for async tasks)
      if (ns.Main && typeof ns.Main.stopExecution === 'function') {
        ns.Main.stopExecution();
      } else {
        // Fallback if Main module/stop function isn't loaded yet or was removed
        ns.stopRequested = true; // Set flag directly
      }

      modalElements.overlay?.remove();
      modalElements = {}; // Clear element references
      if (ns) {
        ns.isRunning = false; // Reset master flag
        ns.actionsRunning = false; // Reset action flag
      }
      console.log('UI: Modal removed.');
    }

    /** Shows the specified page (div) and hides the other. */
    function showPage(pageId) {
      if (modalElements.page1)
        modalElements.page1.style.display =
          pageId === PAGE1_ID ? 'flex' : 'none';
      if (modalElements.page2)
        modalElements.page2.style.display =
          pageId === PAGE2_ID ? 'flex' : 'none';
    }

    /**
     * Creates the entire modal structure and appends it to the body.
     * @param {object} initialConfig - The initial configuration object (delays, action, etc.).
     * @returns {object | null} The `modalElements` object containing references, or null on failure.
     */
    function createModalStructure(initialConfig) {
      removeModal(); // Ensure clean state before creation
      modalElements = {
        /* Reset all refs */ overlay: null,
        modal: null,
        page1: null,
        page2: null,
        videoList: null,
        searchInput: null,
        configureButton: null,
        backButton: null,
        runButton: null,
        statusArea: null,
        delayInputs: {},
        randomnessInput: null,
        actionRadios: {},
        sortRadios: {},
        playlistNameInput: null,
        visibilitySelect: null,
        playlistConfigDiv: null,
        selectAllCheckbox: null,
        selectNoneButton: null,
      };

      try {
        // --- Create Overlay and Modal ---
        modalElements.overlay = createStyledElement(
          'div',
          {},
          { id: OVERLAY_ID }
        );
        modalElements.modal = createStyledElement('div', {}, { id: MODAL_ID });

        // --- Create Page 1 ---
        modalElements.page1 = createStyledElement('div', {}, { id: PAGE1_ID });
        const header1 = createStyledElement(
          'div',
          {},
          { class: 'modal-header', id: 'page1-header' }
        );
        const title1 = createStyledElement('h2', {}, {}, 'Select Videos');
        modalElements.searchInput = createStyledElement(
          'input',
          {},
          {
            type: 'search',
            id: SEARCH_INPUT_ID,
            placeholder: 'Filter by title...',
          }
        );
        const closeButton1 = createStyledElement(
          'button',
          {},
          { class: 'close-button', 'aria-label': 'Close' },
          '✕'
        );
        closeButton1.onclick = removeModal;
        header1.append(title1, modalElements.searchInput, closeButton1);
        const selectionControls = createStyledElement(
          'div',
          {},
          { id: 'yt-bulk-action-selection-controls' }
        );
        const selectAllLabel = createStyledElement('label', {});
        modalElements.selectAllCheckbox = createStyledElement(
          'input',
          {},
          { type: 'checkbox', id: 'yt-bulk-action-select-all', checked: true }
        );
        selectAllLabel.append(
          modalElements.selectAllCheckbox,
          ' Select/Deselect All Visible'
        );
        modalElements.selectNoneButton = createStyledElement(
          'button',
          {},
          { id: 'yt-bulk-action-select-none' },
          'Select None'
        );
        selectionControls.append(
          selectAllLabel,
          modalElements.selectNoneButton
        );
        modalElements.videoList = createStyledElement(
          'div',
          {},
          { id: VIDEO_LIST_ID }
        );
        const footer1 = createStyledElement(
          'div',
          {},
          { class: 'modal-footer', id: 'page1-footer' }
        );
        modalElements.statusArea = createStyledElement(
          'div',
          {},
          { id: STATUS_AREA_ID },
          'Initializing...'
        );
        modalElements.configureButton = createStyledElement(
          'button',
          {},
          { id: 'configure-button' },
          'Configure & Run →'
        );
        footer1.append(modalElements.statusArea, modalElements.configureButton);
        modalElements.page1.append(
          header1,
          selectionControls,
          modalElements.videoList,
          footer1
        );

        // --- Create Page 2 ---
        modalElements.page2 = createStyledElement(
          'div',
          { display: 'none' },
          { id: PAGE2_ID }
        ); // Initially hidden
        const header2 = createStyledElement(
          'div',
          {},
          { class: 'modal-header', id: 'page2-header' }
        );
        modalElements.backButton = createStyledElement(
          'button',
          {},
          { id: 'back-button' },
          '← Back to List'
        );
        const title2 = createStyledElement('h2', {}, {}, 'Configure Actions');
        const closeButton2 = createStyledElement(
          'button',
          {},
          { class: 'close-button', 'aria-label': 'Close' },
          '✕'
        );
        closeButton2.onclick = removeModal;
        header2.append(modalElements.backButton, title2, closeButton2);
        const configScrollArea = createStyledElement(
          'div',
          {},
          { class: 'config-scroll-area' }
        );

        // Action Config Section
        const actionContainer = createStyledElement(
          'div',
          {},
          { class: 'config-section', id: 'action-config' }
        );
        const actionTitle = createStyledElement(
          'h4',
          {},
          {},
          'Action To Perform'
        );
        const actionRadioGroup = createStyledElement(
          'div',
          {},
          { class: 'radio-group' }
        );
        modalElements.actionRadios = {};
        ['Add to Queue', 'Add to New Playlist'].forEach((text) => {
          const v = text.toLowerCase().replace(/ /g, '_');
          const l = createStyledElement('label');
          const r = createStyledElement(
            'input',
            {},
            { type: 'radio', name: 'action-type', value: v, id: `action-${v}` }
          );
          if (v === initialConfig.action) r.checked = true;
          l.append(r, text);
          actionRadioGroup.append(l);
          modalElements.actionRadios[v] = r;
        });
        actionContainer.append(actionTitle, actionRadioGroup);

        // Playlist Config Section
        modalElements.playlistConfigDiv = createStyledElement(
          'div',
          {
            display:
              initialConfig.action === 'add_to_new_playlist' ? '' : 'none',
          },
          { class: 'config-section', id: 'playlist-config' }
        );
        const playlistTitle = createStyledElement(
          'h4',
          {},
          {},
          'New Playlist Options'
        );
        const nameLabel = createStyledElement(
          'label',
          {},
          { for: 'playlist-name-input' },
          'Playlist Name:'
        );
        modalElements.playlistNameInput = createStyledElement(
          'input',
          {},
          {
            type: 'text',
            id: 'playlist-name-input',
            placeholder: 'Enter name...',
          }
        );
        const visibilityLabel = createStyledElement(
          'label',
          {},
          { for: 'playlist-visibility-select' },
          'Visibility:'
        );
        modalElements.visibilitySelect = createStyledElement(
          'select',
          {},
          { id: 'playlist-visibility-select' }
        );
        Object.entries(VISIBILITY_DESCRIPTIONS).forEach(([key, desc]) => {
          const opt = createStyledElement(
            'option',
            {},
            { value: key },
            `${key} (${desc})`
          );
          if (key === initialConfig.newPlaylistVisibility) opt.selected = true;
          modalElements.visibilitySelect.append(opt);
        });
        modalElements.playlistConfigDiv.append(
          playlistTitle,
          nameLabel,
          modalElements.playlistNameInput,
          visibilityLabel,
          modalElements.visibilitySelect
        );

        // Sort Config Section
        const sortContainer = createStyledElement(
          'div',
          {},
          { class: 'config-section', id: 'sort-config' }
        );
        const sortTitle = createStyledElement('h4', {}, {}, 'Processing Order');
        const sortRadioGroup = createStyledElement(
          'div',
          {},
          { class: 'radio-group' }
        );
        modalElements.sortRadios = {};
        ['Oldest First', 'Newest First'].forEach((text) => {
          const v = text.toLowerCase().replace(/ /g, '_');
          const l = createStyledElement('label');
          const r = createStyledElement(
            'input',
            {},
            { type: 'radio', name: 'sort-order', value: v, id: `sort-${v}` }
          );
          if (v === initialConfig.sortOrder) r.checked = true;
          l.append(r, text);
          sortRadioGroup.append(l);
          modalElements.sortRadios[v] = r;
        });
        sortContainer.append(sortTitle, sortRadioGroup);

        // Delay Config Section
        const delayContainer = createStyledElement(
          'div',
          {},
          { class: 'config-section', id: 'delay-config' }
        );
        const delayTitle = createStyledElement(
          'h4',
          {},
          {},
          'Timing Delays (ms)'
        );
        const delayGrid = createStyledElement(
          'div',
          {},
          { id: 'delay-config-grid' }
        );
        modalElements.delayInputs = {};
        const delayFields = [
          {
            id: 'delay-after-menu-click',
            label: 'Menu Open Wait',
            key: 'afterMenuClick',
          },
          {
            id: 'delay-after-add-click',
            label: 'Action Finish Wait',
            key: 'afterAddClick',
          },
          {
            id: 'delay-between-videos',
            label: 'Between Videos Wait',
            key: 'betweenVideos',
          },
          {
            id: 'delay-between-dialog-actions',
            label: 'Dialog Step Wait',
            key: 'betweenDialogActions',
          },
          {
            id: 'delay-randomness-percent',
            label: 'Randomness Factor (%)',
            key: 'randomnessPercent',
          },
        ];
        delayFields.forEach((field) => {
          let defaultValue = 0;
          try {
            defaultValue =
              field.key === 'randomnessPercent'
                ? (initialConfig?.randomnessPercent ??
                  ns.config.DEFAULT_RANDOMNESS_PERCENT ??
                  0)
                : (initialConfig?.delays?.[field.key] ??
                  ns.config.DEFAULT_DELAYS?.[field.key] ??
                  0);
            if (
              typeof defaultValue !== 'number' ||
              Number.isNaN(defaultValue) ||
              defaultValue < 0
            ) {
              defaultValue = 0;
            }
          } catch (e) {
            defaultValue = 0;
          }
          const { container, input } = createDelayInput(
            field.id,
            field.label,
            defaultValue
          );
          delayGrid.appendChild(container);
          if (field.key === 'randomnessPercent') {
            modalElements.randomnessInput = input;
            input.max = '100';
            input.step = '5';
          } else {
            modalElements.delayInputs[field.key] = input;
          }
        });
        delayContainer.append(delayTitle, delayGrid);

        // Append sections to scroll area
        configScrollArea.append(
          actionContainer,
          modalElements.playlistConfigDiv,
          sortContainer,
          delayContainer
        );

        // Footer Page 2
        const footer2 = createStyledElement(
          'div',
          {},
          { class: 'modal-footer', id: 'page2-footer' }
        );
        modalElements.runButton = createStyledElement(
          'button',
          {},
          { id: 'run-button' },
          'Run Actions'
        );
        footer2.appendChild(modalElements.runButton);
        modalElements.page2.append(header2, configScrollArea, footer2);

        // Append pages to modal, modal to overlay, overlay to body
        modalElements.modal.append(modalElements.page1, modalElements.page2);
        modalElements.overlay.appendChild(modalElements.modal);
        document.body.appendChild(modalElements.overlay);

        injectStyles(); // Inject CSS after elements are in DOM

        return modalElements; // Return references
      } catch (error) {
        console.error('UI Error: Failed to create modal structure.', error);
        alert('Failed to create the script UI. Check console for errors.');
        removeModal(); // Clean up partial UI if creation failed
        return null;
      }
    }

    /** Creates and appends a single video item row to the list. */
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
      ); // Default checked
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
      // Store essential data directly on the element for easy access later
      entryDiv.ytBulkData = {
        menuButtonElement: videoData.menuButtonElement,
        title: videoData.title,
        originalIndex: videoData.originalIndex,
      };
    }

    /** Updates the status message text area. */
    function updateStatus(message, isError = false) {
      if (modalElements.statusArea) {
        modalElements.statusArea.textContent = message;
        modalElements.statusArea.style.color = isError ? '#ff8a8a' : '#aaa'; // Use red for errors
      }
      if (isError) console.error('UI Status:', message);
      else console.info('UI Status:', message);
    }

    /** Adds/removes CSS classes to indicate video item processing status. */
    function updateListItemStatus(itemDiv, status) {
      // status: 'processing', 'done', 'failed', 'reset'
      if (!itemDiv) return;
      const updateItem = itemDiv instanceof HTMLElement;
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
          break; // Keep disabled on success
        case 'failed':
          updateItem.classList.add('yt-bulk-item-failed');
          updateItem.style.opacity = '0.6';
          if (checkbox) checkbox.disabled = false;
          break; // Re-enable on fail
        case 'reset': // Fallthrough intentional
        default:
          updateItem.style.opacity = '1';
          if (checkbox) checkbox.disabled = false;
          break; // Reset state
      }
    }

    /** Updates the state of the Select All checkbox based on visible items. */
    function updateSelectAllCheckboxState() {
      if (!modalElements.videoList || !modalElements.selectAllCheckbox) return;
      const visibleItems = Array.from(modalElements.videoList.children).filter(
        (el) =>
          el.matches(`.${VIDEO_ITEM_CLASS}`) && el.style.display !== 'none'
      );
      if (visibleItems.length === 0) {
        modalElements.selectAllCheckbox.checked = false;
        modalElements.selectAllCheckbox.indeterminate = false;
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
        modalElements.selectAllCheckbox.checked = true;
        modalElements.selectAllCheckbox.indeterminate = false;
      } else if (noneChecked) {
        modalElements.selectAllCheckbox.checked = false;
        modalElements.selectAllCheckbox.indeterminate = false;
      } else {
        modalElements.selectAllCheckbox.checked = false;
        modalElements.selectAllCheckbox.indeterminate = true;
      } // Indeterminate state
    }

    /** Checks or unchecks all *visible* video item checkboxes. */
    function toggleAllVisible(checkedState) {
      if (!modalElements.videoList) return;
      const visibleItems = modalElements.videoList.querySelectorAll(
        `.${VIDEO_ITEM_CLASS}:not([style*="display: none"])`
      );
      visibleItems.forEach((item) => {
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = checkedState;
      });
      updateSelectAllCheckboxState(); // Update master checkbox state
    }

    /** Clears and populates the video list in the modal. */
    function populateVideoList(videoDataArray) {
      if (!modalElements.videoList) {
        console.error('UI: Cannot populate list, list element missing.');
        return;
      }
      // Clear list safely
      while (modalElements.videoList.firstChild) {
        modalElements.videoList.removeChild(modalElements.videoList.firstChild);
      }
      videoDataArray.forEach((video, index) =>
        addVideoToList(video, index, modalElements.videoList)
      );
      updateSelectAllCheckboxState(); // Update checkbox state after populating
      console.log(`UI: Populated list with ${videoDataArray.length} videos.`);
    }

    /** Filters the video list based on the search term. */
    function filterList(searchTerm) {
      if (!modalElements.videoList) return;
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      const items = modalElements.videoList.querySelectorAll(
        `.${VIDEO_ITEM_CLASS}`
      );
      let visibleCount = 0;
      items.forEach((itemDiv) => {
        const checkItem = itemDiv instanceof HTMLElement;
        const title = checkItem.ytBulkData?.title?.toLowerCase() || '';
        const isVisible = !lowerSearchTerm || title.includes(lowerSearchTerm);
        checkItem.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount += 1;
      });
      updateSelectAllCheckboxState(); // Update master checkbox after filtering
      console.log(`UI: Filter applied. ${visibleCount} items visible.`);
    }

    // --- Expose Public Methods & Constants ---
    return {
      createModalStructure,
      removeModal,
      showPage,
      populateVideoList,
      filterList,
      updateStatus,
      updateListItemStatus,
      getElements: () => modalElements, // Provide access to element references
      updateSelectAllCheckboxState,
      toggleAllVisible,
      // Constants needed by Main module
      PAGE1_ID,
      PAGE2_ID,
      VIDEO_ITEM_CLASS,
      VIDEO_LIST_ID,
      SEARCH_INPUT_ID,
    };
  })(); // End of IIFE for UI module
})(); // End of wrapper IIFE
