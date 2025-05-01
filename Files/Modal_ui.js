// --- modal_ui.js ---
(function() {
    "use strict";
    console.log("Loading: modal_ui.js");

     if (window.ytBulkActionsUI) {
        console.log("UI module already defined.");
        return;
    }

    window.ytBulkActionsUI = (function() {
        "use strict";

        const MODAL_ID = 'yt-bulk-action-modal';
        const OVERLAY_ID = 'yt-bulk-action-overlay';
        const PAGE1_ID = 'yt-bulk-action-page1';
        const PAGE2_ID = 'yt-bulk-action-page2';
        const VIDEO_LIST_ID = 'yt-bulk-action-video-list';
        const SEARCH_INPUT_ID = 'yt-bulk-action-search';
        const STATUS_AREA_ID = 'yt-bulk-action-status';
        const VIDEO_ITEM_CLASS = 'yt-bulk-action-video-item';

        let modalElements = { // Store refs centrally
            overlay: null, modal: null, page1: null, page2: null, videoList: null,
            searchInput: null, configureButton: null, backButton: null, runButton: null,
            statusArea: null, delayInputs: {}, randomnessInput: null, actionRadios: {},
            playlistNameInput: null, visibilitySelect: null, playlistConfigDiv: null,
            selectAllCheckbox: null, selectNoneButton: null
        };

        const VISIBILITY_DESCRIPTIONS = {
            Public: 'Anyone can search for and view',
            Unlisted: 'Anyone with the link can view',
            Private: 'Only you can view'
        };

        // --- Internal UI Helpers ---

        function removeModal() {
            modalElements.overlay?.remove();
            // Reset refs to allow recreation
            modalElements = { overlay: null, modal: null, page1: null, page2: null, videoList: null, searchInput: null, configureButton: null, backButton: null, runButton: null, statusArea: null, delayInputs: {}, randomnessInput: null, actionRadios: {}, playlistNameInput: null, visibilitySelect: null, playlistConfigDiv: null, selectAllCheckbox: null, selectNoneButton: null };
            // Reset the running flag in main module if it exists
            if (window.ytBulkActions) window.ytBulkActions.isRunning = false;
        }

        function showPage(pageId) {
            if (modalElements.page1) modalElements.page1.style.display = (pageId === PAGE1_ID) ? 'flex' : 'none'; // Use flex
            if (modalElements.page2) modalElements.page2.style.display = (pageId === PAGE2_ID) ? 'flex' : 'none'; // Use flex
        }

        function createStyledElement(tag, styles = {}, attributes = {}, textContent = '') {
            const el = document.createElement(tag);
            Object.assign(el.style, styles);
            for (const key in attributes) {
                el.setAttribute(key, attributes[key]);
            }
            if (textContent) el.textContent = textContent;
            return el;
        }

         function createDelayInput(id, labelText, defaultValue) {
             const container = createStyledElement('div', { marginBottom: '8px' });
             const label = createStyledElement('label', { display: 'block', marginBottom: '4px', fontSize: '12px', color: '#aaa' }, { for: id }, labelText + ':');
             const input = createStyledElement('input',
                 { width: '70px', padding: '4px', borderRadius: '3px', border: '1px solid #666', backgroundColor: '#111', color: '#eee', fontSize: '12px', marginLeft: '5px' },
                 { type: 'number', id: id, value: defaultValue, min: '0', step: '50' } // Allow steps of 50ms maybe
             );
             container.append(label, input);
             return { container, input };
         }

        // --- Public UI Functions ---

        function createModalStructure(defaultConfig) {
            removeModal();

            modalElements.overlay = createStyledElement('div', {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: '25000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Roboto", Arial, sans-serif'
            }, { id: OVERLAY_ID });

            modalElements.modal = createStyledElement('div', {
                backgroundColor: '#212121', color: '#eee', padding: '0',
                borderRadius: '8px', zIndex: '25001', width: '85%', maxWidth: '850px',
                height: '90vh', display: 'flex', flexDirection: 'column',
                border: '1px solid #555', overflow: 'hidden'
            }, { id: MODAL_ID });

            // --- Page 1: List and Filter ---
            modalElements.page1 = createStyledElement('div', { display: 'flex', flexDirection: 'column', height: '100%', padding: '15px 20px', boxSizing: 'border-box' }, { id: PAGE1_ID });

            const header1 = createStyledElement('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: '0' });
            const title1 = createStyledElement('h2', { margin: '0', fontSize: '18px', color: '#f1f1f1', fontWeight: '500' }, {}, 'Select Videos');
             modalElements.searchInput = createStyledElement('input',
                 { padding: '8px 10px', marginLeft: '20px', flexGrow: '1', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#121212', color: '#eee', fontSize: '14px' },
                 { type: 'search', id: SEARCH_INPUT_ID, placeholder: 'Filter by title...' }
             );
            header1.append(title1, modalElements.searchInput);

             const selectionControls = createStyledElement('div', {display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center'});
             const selectAllLabel = createStyledElement('label', {display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#aaa'});
             modalElements.selectAllCheckbox = createStyledElement('input', { type: 'checkbox', marginRight: '5px', accentColor: '#3ea6ff', cursor: 'pointer' });
             selectAllLabel.append(modalElements.selectAllCheckbox, 'Select/Deselect All Visible');
             modalElements.selectNoneButton = createStyledElement('button', {padding: '4px 8px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#555', border:'none', borderRadius:'3px', color: '#eee'}, {}, 'Select None');
             selectionControls.append(selectAllLabel, modalElements.selectNoneButton);


            modalElements.videoList = createStyledElement('div', {
                flexGrow: '1', overflowY: 'auto', border: '1px solid #383838',
                marginBottom: '10px', padding: '5px', borderRadius: '4px'
            }, { id: VIDEO_LIST_ID });

            const footer1 = createStyledElement('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexShrink: '0', paddingTop: '10px', borderTop: '1px solid #383838' });
            modalElements.statusArea = createStyledElement('div', { fontSize: '12px', color: '#aaa', flexGrow: '1', marginRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, { id: STATUS_AREA_ID }, 'Scanning page...');
            modalElements.configureButton = createStyledElement('button',
                 { padding: '8px 15px', cursor: 'pointer', backgroundColor: '#3ea6ff', color: '#111', border: 'none', borderRadius: '4px', fontWeight: '500' },
                 {}, 'Configure Run →'
             );
             footer1.append(modalElements.statusArea, modalElements.configureButton);

            modalElements.page1.append(header1, selectionControls, modalElements.videoList, footer1);


            // --- Page 2: Configuration ---
            modalElements.page2 = createStyledElement('div', { display: 'none', flexDirection: 'column', height: '100%', padding: '15px 20px', boxSizing: 'border-box' }, { id: PAGE2_ID }); // Initially hidden

            const header2 = createStyledElement('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: '0' });
             modalElements.backButton = createStyledElement('button',
                 { padding: '8px 15px', cursor: 'pointer', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '4px', marginRight: 'auto' }, // Pushes title/close to right
                 {}, '← Back'
             );
             const title2 = createStyledElement('h2', { margin: '0 auto', fontSize: '18px', color: '#f1f1f1', fontWeight: '500' }, {}, 'Configure Actions'); // Center title via auto margins
            const closeButton = createStyledElement('button',
                 { background: 'none', border: 'none', color: '#aaa', fontSize: '24px', cursor: 'pointer', lineHeight: '1', padding: '0 5px', marginLeft: 'auto' }, // Pushes itself right
                 {}, '✕'
             );
             closeButton.onclick = removeModal;
            header2.append(modalElements.backButton, title2, closeButton);

             const configScrollArea = createStyledElement('div', { flexGrow: '1', overflowY: 'auto', padding: '0 10px 10px 0' }); // Add some padding for scrollbar

            // --- Delays ---
            const delayContainer = createStyledElement('div', { border: '1px solid #444', borderRadius: '4px', padding: '15px', marginBottom: '15px' });
             const delayTitle = createStyledElement('h4', { margin: '0 0 15px 0', textAlign: 'center', fontSize: '14px', color: '#ccc', fontWeight: '500' }, {}, 'Timing Delays (milliseconds)');
             const delayGrid = createStyledElement('div', { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 15px' }); // Responsive grid

            const delayFields = [
                 { id: 'delay-after-menu-click', label: 'Menu Open Wait', value: defaultConfig.delays.afterMenuClick },
                 { id: 'delay-after-add-click', label: 'Action Finish Wait', value: defaultConfig.delays.afterAddClick },
                 { id: 'delay-between-videos', label: 'Between Videos Wait', value: defaultConfig.delays.betweenVideos },
                 { id: 'delay-between-dialog-actions', label: 'Dialog Step Wait', value: defaultConfig.delays.betweenDialogActions },
                 { id: 'delay-randomness-percent', label: 'Randomness Factor (%)', value: defaultConfig.randomnessPercent } // Add randomness input here
             ];

             delayFields.forEach(field => {
                  const { container, input } = createDelayInput(field.id, field.label, field.value);
                  delayGrid.appendChild(container);
                  const key = field.id.replace('delay-', '').replace(/-/g, '_');
                  if (key === 'randomness_percent') {
                       modalElements.randomnessInput = input;
                       input.step = '5'; // Allow steps of 5% maybe
                       input.max = '100';
                  } else {
                       modalElements.delayInputs[key] = input;
                  }
              });

            delayContainer.append(delayTitle, delayGrid);

            // --- Action Selection ---
            const actionContainer = createStyledElement('div', { border: '1px solid #444', borderRadius: '4px', padding: '15px', marginBottom: '15px' });
             const actionTitle = createStyledElement('h4', { margin: '0 0 10px 0', textAlign: 'center', fontSize: '14px', color: '#ccc', fontWeight: '500' }, {}, 'Action To Perform');
             const radioGroup = createStyledElement('div', { display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '15px' });

            ['Add to Queue', 'Add to New Playlist'].forEach((actionText, index) => {
                 const value = actionText.toLowerCase().replace(/ /g, '_');
                 const label = createStyledElement('label', { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#eee' });
                 const radio = createStyledElement('input', { marginRight: '6px', cursor: 'pointer', accentColor: '#3ea6ff', transform: 'scale(1.1)' }, { type: 'radio', name: 'action-type', value: value, id: `action-${value}`});
                 if (value === defaultConfig.action) radio.checked = true; // Set default based on config
                 label.append(radio, actionText);
                 radioGroup.appendChild(label);
                 modalElements.actionRadios[value] = radio;
             });

            actionContainer.append(actionTitle, radioGroup);

            // --- Playlist Config (Initially Hidden/Shown based on default action) ---
            modalElements.playlistConfigDiv = createStyledElement('div', {
                border: '1px solid #444', borderRadius: '4px', padding: '15px',
                display: defaultConfig.action === 'add_to_new_playlist' ? '' : 'none' // Set initial display
            });
            const playlistTitle = createStyledElement('h4', { margin: '0 0 10px 0', textAlign: 'center', fontSize: '14px', color: '#ccc', fontWeight: '500' }, {}, 'New Playlist Options');

            const nameLabel = createStyledElement('label', { display: 'block', marginBottom: '4px', fontSize: '13px', color: '#aaa' }, { for: 'playlist-name-input' }, 'Playlist Name:');
            modalElements.playlistNameInput = createStyledElement('input',
                { width: 'calc(100% - 12px)', padding: '6px', borderRadius: '3px', border: '1px solid #666', backgroundColor: '#111', color: '#eee', fontSize: '13px', marginBottom: '12px' },
                { type: 'text', id: 'playlist-name-input', placeholder: 'Enter name...' }
            );

            const visibilityLabel = createStyledElement('label', { display: 'block', marginBottom: '4px', fontSize: '13px', color: '#aaa' }, { for: 'playlist-visibility-select' }, 'Visibility:');
            modalElements.visibilitySelect = createStyledElement('select',
                { width: '100%', padding: '6px', borderRadius: '3px', border: '1px solid #666', backgroundColor: '#111', color: '#eee', fontSize: '13px', cursor: 'pointer' },
                { id: 'playlist-visibility-select' }
            );

            Object.entries(VISIBILITY_DESCRIPTIONS).forEach(([key, desc]) => {
                 const option = createStyledElement('option', {padding: '5px'}, { value: key }, `${key} (${desc})`);
                 if (key === defaultConfig.newPlaylistVisibility) option.selected = true;
                 modalElements.visibilitySelect.appendChild(option);
             });

            modalElements.playlistConfigDiv.append(playlistTitle, nameLabel, modalElements.playlistNameInput, visibilityLabel, modalElements.visibilitySelect);

            configScrollArea.append(delayContainer, actionContainer, modalElements.playlistConfigDiv);

            const footer2 = createStyledElement('div', { display: 'flex', justifyContent: 'center', marginTop: '15px', flexShrink: '0', paddingTop: '15px', borderTop: '1px solid #383838' });
            modalElements.runButton = createStyledElement('button',
                 { padding: '10px 25px', cursor: 'pointer', backgroundColor: '#5fde5f', color: '#111', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' },
                 {}, 'Run Actions'
             );
            footer2.appendChild(modalElements.runButton);

            modalElements.page2.append(header2, configScrollArea, footer2);

            modalElements.modal.append(modalElements.page1, modalElements.page2);
            modalElements.overlay.appendChild(modalElements.modal);
            document.body.appendChild(modalElements.overlay);

            return modalElements.videoList;
        }

        function addVideoToList(videoData, videoIndex, listElement) {
             const entryDiv = createStyledElement('div', {
                 display: 'flex', alignItems: 'center', padding: '6px 4px',
                 borderBottom: '1px solid #383838', fontSize: '13px', transition: 'opacity 0.3s ease'
             }, { class: VIDEO_ITEM_CLASS, 'data-video-index': videoIndex });

             const checkbox = createStyledElement('input',
                 { flexShrink: '0', marginRight: '10px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3ea6ff' },
                 { type: 'checkbox', 'data-video-index': videoIndex }
             );

             const detailsDiv = createStyledElement('div', { display: 'flex', flexDirection: 'column', flexGrow: '1', overflow: 'hidden', marginRight: '10px' });
             const titleSpan = createStyledElement('span',
                 { fontWeight: '500', color: '#f1f1f1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px', display: 'block', lineHeight: '1.3' },
                 { title: videoData.title },
                 videoData.title || 'Unknown Title'
             );
             const metaSpan = createStyledElement('span', { fontSize: '12px', color: '#aaa', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }, {},
                  `${videoData.duration || '?'}  •  ${videoData.uploadDate || '?'}`
             );

             detailsDiv.append(titleSpan, metaSpan);
             entryDiv.append(checkbox, detailsDiv);
             listElement.appendChild(entryDiv);

             // Store essential data directly on the div for easier access during run
             entryDiv.ytBulkData = {
                 menuButtonElement: videoData.menuButtonElement,
                 title: videoData.title // Store title for easier filtering logic access later
             };
        }

        function filterList(searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase().trim();
            const items = modalElements.videoList?.querySelectorAll(`.${VIDEO_ITEM_CLASS}`);
             let visibleCount = 0;
             if (!items) return;

            items.forEach(itemDiv => {
                const title = itemDiv.ytBulkData?.title?.toLowerCase() || '';
                const isVisible = lowerSearchTerm === '' || title.includes(lowerSearchTerm);
                itemDiv.style.display = isVisible ? 'flex' : 'none';
                if (isVisible) visibleCount++;
            });
             // Update select all checkbox state based on visible items
             updateSelectAllCheckboxState();
             console.log(`Filter applied. ${visibleCount} items visible.`);
        }

        function updateStatus(message, isError = false) {
            if (modalElements.statusArea) {
                modalElements.statusArea.textContent = message;
                modalElements.statusArea.style.color = isError ? '#ff8a8a' : '#aaa';
            }
            if(isError) console.error("Status:", message); else console.info("Status:", message);
        }

         function updateListItemStatus(itemDiv, status) { // status: 'processing', 'done', 'failed', 'reset'
             if (!itemDiv) return;
             itemDiv.classList.remove('yt-bulk-item-processing', 'yt-bulk-item-done', 'yt-bulk-item-failed');
             const checkbox = itemDiv.querySelector('input[type="checkbox"]');

             switch (status) {
                 case 'processing':
                     itemDiv.classList.add('yt-bulk-item-processing');
                     itemDiv.style.opacity = '0.7';
                     if(checkbox) checkbox.disabled = true;
                     break;
                 case 'done':
                      itemDiv.classList.add('yt-bulk-item-done');
                      itemDiv.style.opacity = '0.4';
                      if(checkbox) checkbox.disabled = true; // Keep disabled after success
                     break;
                 case 'failed':
                      itemDiv.classList.add('yt-bulk-item-failed');
                      itemDiv.style.opacity = '0.6';
                      if(checkbox) checkbox.disabled = false; // Allow re-try?
                     break;
                 case 'reset':
                 default:
                      itemDiv.style.opacity = '1';
                      if(checkbox) checkbox.disabled = false;
                     break;
             }
         }

         /** Update the 'Select All' checkbox based on visible item states */
         function updateSelectAllCheckboxState() {
             if (!modalElements.videoList || !modalElements.selectAllCheckbox) return;
             const visibleItems = modalElements.videoList.querySelectorAll(`.${VIDEO_ITEM_CLASS}[style*="display: flex"], .${VIDEO_ITEM_CLASS}:not([style*="display: none"])`); // More robust visibility check
             let allVisibleChecked = visibleItems.length > 0;
             let noneVisibleChecked = true;

             visibleItems.forEach(item => {
                 const cb = item.querySelector('input[type="checkbox"]');
                 if (!cb || !cb.checked) {
                     allVisibleChecked = false;
                 }
                 if (cb?.checked) {
                     noneVisibleChecked = false;
                 }
             });

             if (visibleItems.length === 0) { // No items visible
                 modalElements.selectAllCheckbox.checked = false;
                 modalElements.selectAllCheckbox.indeterminate = false;
             } else if (allVisibleChecked) {
                  modalElements.selectAllCheckbox.checked = true;
                  modalElements.selectAllCheckbox.indeterminate = false;
             } else if (noneVisibleChecked) {
                 modalElements.selectAllCheckbox.checked = false;
                 modalElements.selectAllCheckbox.indeterminate = false;
             } else { // Some checked, some not
                 modalElements.selectAllCheckbox.checked = false;
                 modalElements.selectAllCheckbox.indeterminate = true;
             }
         }

          /** Toggle checkboxes for all *visible* items */
          function toggleAllVisible(checkedState) {
             if (!modalElements.videoList) return;
             const visibleItems = modalElements.videoList.querySelectorAll(`.${VIDEO_ITEM_CLASS}[style*="display: flex"], .${VIDEO_ITEM_CLASS}:not([style*="display: none"])`);
             visibleItems.forEach(item => {
                 const cb = item.querySelector('input[type="checkbox"]');
                 if (cb) cb.checked = checkedState;
             });
             updateSelectAllCheckboxState(); // Update master checkbox state
         }


         // Inject CSS for status highlighting
         const styleId = 'yt-bulk-action-styles';
         if (!document.getElementById(styleId)) {
             const styleSheet = document.createElement("style");
             styleSheet.id = styleId;
             styleSheet.textContent = `
                 .${VIDEO_ITEM_CLASS}.yt-bulk-item-processing { background-color: rgba(255, 255, 100, 0.1); border-left: 3px solid orange; }
                 .${VIDEO_ITEM_CLASS}.yt-bulk-item-done { background-color: rgba(100, 255, 100, 0.1); border-left: 3px solid limegreen; }
                 .${VIDEO_ITEM_CLASS}.yt-bulk-item-failed { background-color: rgba(255, 100, 100, 0.15); border-left: 3px solid red; }
             `;
             document.head.appendChild(styleSheet);
         }


        // --- Expose Public Methods ---
        return {
            createModalStructure,
            removeModal,
            showPage,
            addVideoToList,
            filterList,
            updateStatus,
            updateListItemStatus,
            toggleAllVisible,
            updateSelectAllCheckboxState,
            getElements: () => modalElements, // Getter for access
            // Constants for main script
            PAGE1_ID,
            PAGE2_ID,
            VIDEO_ITEM_CLASS,
            VIDEO_LIST_ID,
            SEARCH_INPUT_ID
        };

    })(); // End inner IIFE

    console.log("Loaded: modal_ui.js");
})(); // End outer IIFE