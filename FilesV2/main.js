/* eslint-disable no-alert */
/* eslint-disable no-console */
// --- main.js ---
// Orchestrates the overall script flow, including initialization,
// video gathering, event handling, and action execution.

(function ytBulkActionsMain() {
  // Ensure the global namespace exists
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  // Avoid redefining if already loaded
  if (ns.Main) {
    console.log('Main module already defined.');
    return;
  }

  // --- Dependency Check ---
  if (!ns.Utils || !ns.DOM || !ns.Actions || !ns.UI) {
    console.error(
      'Main Module Error: Missing required dependencies (Utils, DOM, Actions, or UI).'
    );
    alert(
      'Main Module failed to load dependencies. Script cannot run. Check console.'
    );
    // Create dummy Main object to prevent errors if init is called elsewhere
    ns.Main = { init: () => {}, stopExecution: () => {} };
    return;
  }
  // --- End Dependency Check ---

  console.log('Defining: Main Module (Orchestrator)');
  ns.Main = (() => {
    // IIFE for encapsulation
    // Access dependencies via namespace
    const { Utils } = ns;
    const { DOM } = ns;
    const { Actions } = ns;
    const { UI } = ns;

    /** Checks if all required modules seem to be loaded. */
    function checkDependencies() {
      const loaded = !!(Utils && DOM && Actions && UI);
      if (!loaded) {
        console.error(
          'Main Module Error: One or more dependency modules missing at runtime.'
        );
        alert(
          'YT Bulk Actions Error: Failed to load components. Check console.'
        );
      }
      return loaded;
    }

    /**
     * Scrolls the page to load all videos and scrapes relevant data.
     * Checks stopRequested flag periodically.
     * @returns {Promise<Array<object>>} A promise resolving with the array of scraped video data.
     */
    async function gatherAllVideos() {
      console.log('Main: Starting video gathering process...');
      UI.updateStatus('Scrolling to load all videos...');
      let lastHeight = 0;
      let currentHeight = document.documentElement.scrollHeight;
      let consecutiveStableScrolls = 0;
      const MAX_STABLE_SCROLLS = 3;
      const MAX_SCROLLS = 150; // Safety limit
      let lastVideoCount = 0;
      let currentVideoCount = 0;

      const checkScrollStability = async () => {
        await Utils.sleepRandom(
          ns.config.delays.scrollCheckInterval,
          ns.config.randomnessPercent / 2
        );
        currentHeight = document.documentElement.scrollHeight;
        currentVideoCount = document.querySelectorAll(
          DOM.SELECTORS.videoRendererGeneric
        ).length;
        const spinner = document.querySelector(
          DOM.SELECTORS.continuationSpinner
        );
        if (spinner) {
          UI.updateStatus(`Waiting for spinner...`);
          consecutiveStableScrolls = 0;
          lastVideoCount = currentVideoCount;
          return false;
        }
        if (
          currentHeight === lastHeight &&
          currentVideoCount === lastVideoCount
        ) {
          consecutiveStableScrolls += 1;
          UI.updateStatus(
            `Scroll stable (${consecutiveStableScrolls}/${MAX_STABLE_SCROLLS})...`
          );
        } else {
          consecutiveStableScrolls = 0;
          UI.updateStatus(
            `Scrolling... (Height: ${currentHeight}, Videos: ${currentVideoCount})`
          );
        }
        lastHeight = currentHeight;
        lastVideoCount = currentVideoCount;
        return consecutiveStableScrolls >= MAX_STABLE_SCROLLS;
      };

      // Collect promises for all scroll attempts
      const scrollPromises = Array.from({ length: MAX_SCROLLS }, async () => {
        if (ns.stopRequested) {
          console.log('Main: Stop requested during scroll.');
          UI.updateStatus('Scroll stopped.', true);
          return false;
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
        const isStable = await checkScrollStability();
        if (isStable) {
          console.log('Main: Scroll stability reached.');
          return true;
        }
        return false;
      });

      // Process all scroll attempts concurrently
      const results = await Promise.all(scrollPromises);
      const isStable = results.some((result) => result === true);

      if (!isStable) {
        console.warn('Main: Max scroll attempts reached.');
        UI.updateStatus('Max scrolls reached. Scraping loaded videos...', true);
      }

      // --- Scrape Data ---
      if (ns.stopRequested) return []; // Check again before scraping

      UI.updateStatus('Scanning loaded videos...');
      const scrapedData = [];
      const videoElements = document.querySelectorAll(
        DOM.SELECTORS.videoRendererGeneric
      );
      console.log(
        `Main: Found ${videoElements.length} potential video elements.`
      );
      videoElements.forEach((el, index) => {
        if (ns.stopRequested) return; // Allow stopping mid-scrape (less critical)

        const titleElement = el.querySelector(DOM.SELECTORS.titleElement);
        const title =
          titleElement?.getAttribute('aria-label') ||
          titleElement?.textContent?.trim() ||
          `Video ${index + 1}`;
        const durationEl = el.querySelector(DOM.SELECTORS.durationBadge);
        const duration = durationEl?.textContent?.trim() || '?:??';
        const infoContainer = el.querySelector(
          DOM.SELECTORS.videoInfoContainer
        );
        let uploadDate = '?';
        let infoSpans = null;

        // Date scraping logic (Attempt 1: #metadata-line, Attempt 2: #video-info)
        if (infoContainer) {
          infoSpans = infoContainer.querySelectorAll(
            DOM.SELECTORS.videoInfoSpan
          );
          if (infoSpans.length > 0) {
            for (let i = infoSpans.length - 1; i >= 0; i -= 1) {
              const text = infoSpans[i]?.textContent?.trim();
              if (
                text &&
                (text.includes('ago') ||
                  text.includes('Streamed') ||
                  text.includes('Premier') ||
                  text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) ||
                  text.match(
                    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}/i
                  ) ||
                  text.includes('yesterday') ||
                  text.includes('today'))
              ) {
                uploadDate = text;
                break;
              }
            }
          }
        }
        if (uploadDate === '?') {
          const videoInfoElement = el.querySelector(
            DOM.SELECTORS.videoInfoString
          );
          if (videoInfoElement) {
            infoSpans = videoInfoElement.querySelectorAll(
              'span.style-scope.yt-formatted-string'
            );
            if (infoSpans.length > 0) {
              for (let i = infoSpans.length - 1; i >= 0; i -= 1) {
                const text = infoSpans[i]?.textContent?.trim();
                if (
                  text &&
                  (text.includes('ago') ||
                    text.includes('Streamed') ||
                    text.includes('Premier') ||
                    text.match(/\d/) ||
                    text.includes('yesterday') ||
                    text.includes('today'))
                ) {
                  uploadDate = text;
                  break;
                }
              }
            }
          }
        }
        if (uploadDate === '?') {
          console.warn(`Main: Could not extract date for "${title}"`);
        }

        const menuButtonRef = el.querySelector(DOM.SELECTORS.menuButton);
        if (menuButtonRef) {
          scrapedData.push({
            title,
            duration,
            uploadDate,
            menuButtonElement: menuButtonRef,
            originalIndex: index, // Store original DOM order for sorting
            id: title + duration + uploadDate + index, // Simple unique-ish ID
          });
        } else {
          console.warn(
            `Main: Skipping index ${index} ("${title}") - No menu button found.`
          );
        }
      });
      console.log(
        `Main: Scraped ${scrapedData.length} videos with menu buttons.`
      );
      return scrapedData;
    }

    /** Executes the selected bulk action on the chosen videos. */
    async function executeActions() {
      if (ns.actionsRunning) {
        console.warn('Main: Action execution already in progress.');
        return;
      }
      if (ns.videoData.length === 0) {
        console.warn('Main: Execution prevented: No video data loaded.');
        alert('Please wait for videos to load or reload script.');
        return;
      }
      if (!ns.isRunning) ns.isRunning = true; // Ensure master flag is set

      ns.actionsRunning = true; // Set action-specific flag
      ns.stopRequested = false; // Reset stop flag for this run
      console.log('--- Main: Starting Action Execution ---');
      const elements = UI.getElements();
      if (!elements.runButton || !elements.backButton) {
        console.error('Main: Cannot start actions: Modal elements missing.');
        ns.actionsRunning = false;
        ns.isRunning = false;
        return;
      }

      // Disable controls during run
      elements.runButton.disabled = true;
      elements.runButton.textContent = 'Running... (Back/Close to Stop)';
      elements.backButton.disabled = true;

      // --- 1. Read Configuration from UI ---
      const currentDelays = Object.keys(ns.config.DEFAULT_DELAYS).reduce(
        (acc, key) => {
          const inputElement = elements.delayInputs[key];
          const val = parseInt(inputElement?.value, 10);
          acc[key] =
            Number.isNaN(val) || val < 0 ? ns.config.DEFAULT_DELAYS[key] : val;
          return acc;
        },
        {}
      );

      const randomPercentVal = parseInt(elements.randomnessInput.value, 10);
      const currentRandomness =
        Number.isNaN(randomPercentVal) ||
        randomPercentVal < 0 ||
        randomPercentVal > 100
          ? ns.config.DEFAULT_RANDOMNESS_PERCENT
          : randomPercentVal;

      const currentAction = elements.actionRadios.add_to_new_playlist.checked
        ? 'add_to_new_playlist'
        : 'add_to_queue';

      const currentSortOrder = elements.sortRadios.newest_first.checked
        ? 'newest_first'
        : 'oldest_first';

      const currentPlaylistDetails = {
        name: '',
        visibility: 'Private',
      };

      if (currentAction === 'add_to_new_playlist') {
        currentPlaylistDetails.name = elements.playlistNameInput.value.trim();
        currentPlaylistDetails.visibility = elements.visibilitySelect.value;
        if (!currentPlaylistDetails.name) {
          alert('Please enter playlist name.');
          elements.runButton.disabled = false;
          elements.runButton.textContent = 'Run Actions';
          elements.backButton.disabled = false;
          ns.actionsRunning = false;
          ns.isRunning = false;
          return;
        }
      }

      console.log('Main: Running with Config:', {
        delays: currentDelays,
        randomness: currentRandomness,
        action: currentAction,
        sort: currentSortOrder,
        playlist: currentPlaylistDetails,
      });

      // --- 2. Get Selected & Sort Videos ---
      const allVideoItems = Array.from(
        elements.videoList.querySelectorAll(`.${UI.VIDEO_ITEM_CLASS}`)
      );

      const selectedVideos = allVideoItems
        .filter((itemDiv) => {
          const checkbox = itemDiv.querySelector('input[type="checkbox"]');
          return (
            checkbox?.checked &&
            itemDiv.style.display !== 'none' &&
            !itemDiv.classList.contains('yt-bulk-item-done')
          );
        })
        .map((itemDiv) => {
          const videoIndex = parseInt(
            itemDiv.getAttribute('data-video-index'),
            10
          );
          if (
            !Number.isNaN(videoIndex) &&
            ns.videoData[videoIndex] &&
            typeof ns.videoData[videoIndex].originalIndex === 'number'
          ) {
            return {
              index: videoIndex,
              element: itemDiv,
              data: ns.videoData[videoIndex],
            };
          }
          console.warn(
            `Main: Data or originalIndex missing for selected item index ${videoIndex}`
          );
          return null;
        })
        .filter(Boolean);

      selectedVideos.sort((a, b) =>
        currentSortOrder === 'oldest_first'
          ? b.data.originalIndex - a.data.originalIndex
          : a.data.originalIndex - b.data.originalIndex
      );

      if (selectedVideos.length === 0) {
        alert('No videos selected/visible or all already processed.');
        elements.runButton.disabled = false;
        elements.runButton.textContent = 'Run Actions';
        elements.backButton.disabled = false;
        ns.actionsRunning = false;
        ns.isRunning = false;
        return;
      }

      console.log(
        `Main: Processing ${selectedVideos.length} selected videos (${currentSortOrder}).`
      );
      UI.updateStatus(`Processing 0/${selectedVideos.length}...`);

      // --- 3. Iterate & Perform Actions ---
      const actionPromises = selectedVideos.map(async (item, index) => {
        if (ns.stopRequested) {
          console.log('Main: Stop requested before processing next video.');
          return null;
        }

        UI.updateStatus(
          `Processing ${index + 1}/${selectedVideos.length}: ${item.data.title}`
        );
        UI.updateListItemStatus(item.element, 'processing');

        const actionDelays = {
          ...currentDelays,
          randomnessPercent: currentRandomness,
        };

        try {
          const actionSuccess =
            currentAction === 'add_to_queue'
              ? await Actions.performAddToQueue(
                  item.data.menuButtonElement,
                  actionDelays
                )
              : await Actions.performAddToPlaylist(
                  item.data.menuButtonElement,
                  currentPlaylistDetails,
                  actionDelays
                );

          if (actionSuccess) {
            console.log(`   Main Success: "${item.data.title}"`);
            UI.updateListItemStatus(item.element, 'done');
            return { success: true };
          }
          console.warn(`   Main Failed: "${item.data.title}"`);
          UI.updateListItemStatus(item.element, 'failed');
          return { success: false };
        } catch (e) {
          console.error(`Main: Action error for "${item.data.title}":`, e);
          UI.updateListItemStatus(item.element, 'failed');
          return { success: false };
        }
      });

      const results = await Promise.all(actionPromises);

      const successCount = results.filter((result) => result?.success).length;
      const failCount = results.filter(
        (result) => result && !result.success
      ).length;

      // --- 4. Completion / Reset State ---
      const finalMessage = ns.stopRequested
        ? `Stopped. ${successCount} succeeded, ${failCount} failed of attempted.`
        : `Finished. ${successCount} succeeded, ${failCount} failed.`;
      console.log('Main:', finalMessage);
      UI.updateStatus(finalMessage);
      alert(finalMessage);

      // Reset UI and flags
      elements.runButton.textContent = 'Run Actions';
      elements.runButton.disabled = false;
      elements.backButton.disabled = false;
      ns.actionsRunning = false;
      ns.isRunning = false;
      ns.stopRequested = false;
    }

    /** Sets the stopRequested flag and updates UI for immediate feedback. */
    function stopExecution() {
      // Check if the script is doing anything (scanning or executing actions)
      if (ns.isRunning || ns.actionsRunning) {
        if (!ns.stopRequested) {
          // Only act on the first stop request
          ns.stopRequested = true;
          ns.actionsRunning = false; // Assume actions should stop if requested
          console.log('Main: Stop request received.');
          UI.updateStatus('Stopping...'); // Update UI status immediately

          // Immediately try to re-enable buttons for user feedback
          const elements = UI.getElements();
          if (elements.runButton) {
            elements.runButton.disabled = false;
            elements.runButton.textContent = 'Run Actions';
          }
          if (elements.backButton) {
            elements.backButton.disabled = false;
          }
        }
        // The active loops (gatherAllVideos, executeActions) will check ns.stopRequested
        // and break/return. The isRunning flag is fully reset when they finish or when modal is closed.
      } else {
        console.log('Main: Stop requested but script not actively running.');
        ns.stopRequested = false; // Clear flag if nothing was actually running
      }
    }

    /** Sets up event listeners for the modal UI elements. */
    function setupModalEventListeners() {
      const elements = UI.getElements();
      if (!elements.modal) {
        console.error(
          'Main: Cannot setup listeners, modal elements not found.'
        );
        return;
      }

      // Close Buttons (Page 1 & 2 'X', Overlay)
      elements.modal
        .querySelector(`#${UI.PAGE1_ID} button[aria-label="Close"]`)
        ?.addEventListener('click', UI.removeModal);
      elements.overlay.addEventListener('click', (event) => {
        if (event.target === elements.overlay) UI.removeModal();
      });
      const page2CloseButton = elements.page2?.querySelector(
        'button[aria-label="Close"]'
      );
      if (page2CloseButton)
        page2CloseButton.addEventListener('click', UI.removeModal);

      // Page Navigation & Stop
      elements.configureButton.addEventListener('click', () =>
        UI.showPage(UI.PAGE2_ID)
      );
      elements.backButton.addEventListener('click', () => {
        stopExecution(); // Stop actions if running when going back
        UI.showPage(UI.PAGE1_ID);
      });

      // Video List Interaction
      elements.searchInput.addEventListener('input', (e) =>
        UI.filterList(e.target.value)
      );
      elements.searchInput.addEventListener('search', (e) =>
        UI.filterList(e.target.value)
      ); // Handle clear button
      elements.selectAllCheckbox.addEventListener('change', (e) =>
        UI.toggleAllVisible(e.target.checked)
      );
      elements.selectNoneButton.addEventListener('click', () => {
        UI.toggleAllVisible(false);
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = false;
      });
      elements.videoList.addEventListener('change', (e) => {
        if (
          e.target.matches(`.${UI.VIDEO_ITEM_CLASS} input[type="checkbox"]`)
        ) {
          UI.updateSelectAllCheckboxState();
        }
      });

      // Configuration Changes
      Object.values(elements.actionRadios).forEach((radio) =>
        radio.addEventListener('change', () => {
          const showPlaylistConfig =
            elements.actionRadios.add_to_new_playlist.checked;
          elements.playlistConfigDiv.style.display = showPlaylistConfig
            ? ''
            : 'none';
        })
      );

      // Run Button
      elements.runButton.addEventListener('click', executeActions);
    }

    /** Initializes the script: resets state, creates UI, starts video gathering. */
    function init() {
      console.log('Initializing YT Bulk Actions Main Module...');
      if (!checkDependencies()) return;
      if (ns.isRunning) {
        console.warn('Main: Init called while already running.');
        alert('Script is already running.');
        return;
      }

      // --- Initialize State ---
      ns.isRunning = true; // Master flag indicates script is active (scan or actions)
      ns.actionsRunning = false; // Action execution phase is not active yet
      ns.stopRequested = false; // Clear any previous stop request
      ns.videoData = []; // Clear previous video data
      ns.config = {
        // Reset config to defaults
        DEFAULT_DELAYS: { ...ns.config.DEFAULT_DELAYS },
        DEFAULT_RANDOMNESS_PERCENT: ns.config.DEFAULT_RANDOMNESS_PERCENT,
        delays: { ...ns.config.DEFAULT_DELAYS }, // Working copy
        randomnessPercent: ns.config.DEFAULT_RANDOMNESS_PERCENT, // Working copy
        action: 'add_to_queue',
        newPlaylistName: '',
        newPlaylistVisibility: 'Private',
        sortOrder: ns.config.DEFAULT_SORT_ORDER, // Use default sort
      };
      // --- End State Initialization ---

      // Create UI first to show status immediately
      const modalUiElements = UI.createModalStructure(ns.config);
      if (!modalUiElements || !modalUiElements.videoList) {
        console.error('Main: Failed to create modal structure.');
        ns.isRunning = false; // Reset flag if UI fails
        return;
      }
      setupModalEventListeners(); // Wire up the UI buttons/inputs
      UI.updateStatus('Scrolling & gathering videos...'); // Set initial status
      UI.showPage(UI.PAGE1_ID); // Show the first page

      // Start the potentially long-running scrape after a brief delay for UI paint
      setTimeout(() => {
        if (ns.stopRequested) {
          // Check if stopped *before* starting scrape
          console.log('Main: Stop requested before video gathering started.');
          ns.isRunning = false;
          return;
        }
        gatherAllVideos()
          .then((scrapedData) => {
            // Check stop flag *after* scrape finishes but *before* populating UI
            if (ns.stopRequested) {
              console.log('Main: Scan stopped by user request.');
              UI.updateStatus('Scanning stopped.');
              // isRunning remains true technically, until modal is closed or action attempted/finished/stopped
              return; // Don't populate list if stopped
            }
            ns.videoData = scrapedData; // Store results
            UI.populateVideoList(ns.videoData); // Update the UI list
            UI.updateStatus(
              `Scan complete. Found ${ns.videoData.length} videos. Ready.`
            );
            // Keep isRunning=true; ready for user interaction (Configure/Run)
          })
          .catch((error) => {
            console.error('Main: Error during video gathering:', error);
            UI.updateStatus('Error gathering videos. See console.', true);
            ns.isRunning = false; // Allow retry on scan failure
          });
      }, 50); // 50ms delay
    }

    // --- Expose Public Methods ---
    return { init, stopExecution };
  })();

  // --- Userscript Entry Point ---
  console.log('YT Bulk Actions: Script loaded. Waiting for page context...');
  const checkInterval = setInterval(() => {
    // Check for core YT elements to ensure page is somewhat loaded
    if (
      document.querySelector('#masthead-container') &&
      document.querySelector('#content')
    ) {
      clearInterval(checkInterval);
      console.log('YT Bulk Actions: Page ready. Initializing...');
      // Ensure init exists and script isn't already running
      if (!ns.isRunning && typeof ns.Main.init === 'function') {
        ns.Main.init();
      } else if (ns.isRunning) {
        console.log(
          'YT Bulk Actions: Init skipped, script already running (or modal open).'
        );
      } else {
        console.error('YT Bulk Actions: Main.init function not found!');
      }
    }
  }, 500); // Check every 500ms
})(); // End main IIFE
