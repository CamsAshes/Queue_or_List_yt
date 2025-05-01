// --- main.js ---
(function() {
    "use strict";
    console.log("Loading: main.js");

    // --- Global Namespace & State ---
    // Establish namespace if it doesn't exist
    window.ytBulkActions = window.ytBulkActions || {};
    const ns = window.ytBulkActions;

    // State Variables (Initialize within init)
    ns.videoData = [];
    ns.config = {}; // Initialize in init
    ns.config.DEFAULT_DELAYS = { /* Default values */ };
    ns.config.DEFAULT_RANDOMNESS_PERCENT = 30;
    ns.isRunning = false;
    ns.stopRequested = false; // Flag to allow stopping mid-run

    // Dependency Check (Basic)
    function checkDependencies() {
        const loaded = window.ytBulkActionsUtils && window.ytBulkActionsDOM && window.ytBulkActionsActions && window.ytBulkActionsUI;
        if (!loaded) {
            console.error("YT Bulk Actions Error: One or more dependency modules failed to load.");
            alert("YT Bulk Actions Error: Failed to load required script components. Check the console for details.");
        }
        return loaded;
    }


    // --- Initialization ---
    function init() {
        console.log("Initializing YT Bulk Actions...");
        if (!checkDependencies()) return; // Stop if dependencies missing

        // Prevent multiple simultaneous runs
        if (ns.isRunning) {
            console.warn("YT Bulk Actions script is already running.");
            alert('YT Bulk Actions script is already running or the modal is open.');
            return;
        }
        ns.isRunning = true;
        ns.stopRequested = false;

        // Reset state
        ns.videoData = [];
         // Setup default config (merge in case defaults were updated)
         ns.config.DEFAULT_DELAYS = {
             afterMenuClick: 600,
             afterAddClick: 1000,
             betweenVideos: 1500,
             afterScroll: 2500,
             spinnerWaitCheck: 1000,
             afterSpinner: 1000,
             betweenDialogActions: 800,
             scrollCheckInterval: 2000 // How often to check scroll height stability
         };
         ns.config.DEFAULT_RANDOMNESS_PERCENT = 30;
         ns.config.delays = { ...ns.config.DEFAULT_DELAYS };
         ns.config.randomnessPercent = ns.config.DEFAULT_RANDOMNESS_PERCENT;
         ns.config.action = 'add_to_queue';
         ns.config.newPlaylistName = '';
         ns.config.newPlaylistVisibility = 'Private';


        // Create the modal (returns the list container)
        const listContainer = UI.createModalStructure(ns.config); // Pass defaults
        if (!listContainer) {
            console.error("Failed to create modal structure.");
            ns.isRunning = false;
            return;
        }

        setupModalEventListeners(); // Attach event listeners to the new modal

        UI.updateStatus("Scanning page for videos..."); // Initial status

        // Start the background scanning process
        gatherAllVideos(listContainer)
            .then(count => {
                UI.updateStatus(`Scan complete. Found ${count} videos. Ready to configure.`);
            })
            .catch(error => {
                console.error("Error during video gathering:", error);
                UI.updateStatus("Error gathering videos. See console.", true);
            });
    }

    // --- Scrolling and Scraping ---
    async function gatherAllVideos(listContainer) {
        UI.updateStatus("Scrolling to load all videos...");
        let lastHeight = 0;
        let currentHeight = document.documentElement.scrollHeight;
        let consecutiveStableScrolls = 0;
        const MAX_STABLE_SCROLLS = 3;
        let scrollCount = 0;
        const MAX_SCROLLS = 150; // Increased safety limit
        let lastVideoCount = 0;
        let currentVideoCount = 0;

        const checkScrollStability = async () => {
             await Utils.sleepRandom(ns.config.delays.scrollCheckInterval, ns.config.randomnessPercent / 2); // Use randomness here too
             currentHeight = document.documentElement.scrollHeight;
             currentVideoCount = document.querySelectorAll(DOM.SELECTORS.videoRenderer).length;

             const spinner = document.querySelector(DOM.SELECTORS.continuationSpinner);
             if (spinner) {
                 UI.updateStatus(`Waiting for loading spinner (${scrollCount})...`);
                 consecutiveStableScrolls = 0; // Reset stability if spinner appears
                 lastVideoCount = currentVideoCount;
                 return false; // Not stable if spinner active
             }

             if (currentHeight === lastHeight && currentVideoCount === lastVideoCount) {
                 consecutiveStableScrolls++;
                 UI.updateStatus(`Scroll height/count stable (${consecutiveStableScrolls}/${MAX_STABLE_SCROLLS})...`);
             } else {
                 consecutiveStableScrolls = 0;
                 UI.updateStatus(`Scrolling... (${scrollCount + 1}, Height: ${currentHeight}, Videos: ${currentVideoCount})`);
             }
             lastHeight = currentHeight;
             lastVideoCount = currentVideoCount;
             return consecutiveStableScrolls >= MAX_STABLE_SCROLLS;
        };

        while (scrollCount < MAX_SCROLLS) {
            window.scrollTo(0, document.documentElement.scrollHeight);
            scrollCount++;
            if (await checkScrollStability()) {
                 console.log("Scroll stability reached. Assuming end of list.");
                 break;
             }
        }

        if (scrollCount >= MAX_SCROLLS) {
            console.warn("Reached max scroll attempts during loading.");
            UI.updateStatus("Reached max scroll attempts. Scraping loaded videos...", true);
        }

        // --- Scrape Data ---
        UI.updateStatus("Scanning loaded videos...");
        ns.videoData = []; // Clear previous data
        const videoElements = document.querySelectorAll(DOM.SELECTORS.videoRenderer);
        console.log(`Found ${videoElements.length} video elements to scrape.`);

        videoElements.forEach((el, index) => {
            const titleH3 = el.querySelector(DOM.SELECTORS.titleH3);
            const titleLink = el.querySelector(DOM.SELECTORS.titleLink);
            const title = titleH3?.getAttribute('aria-label') || titleLink?.getAttribute('title') || titleLink?.textContent?.trim() || `Video ${index + 1}`;

            const durationEl = el.querySelector(DOM.SELECTORS.durationBadge);
            const duration = durationEl?.textContent?.trim() || '?:??';

             const infoContainer = el.querySelector(DOM.SELECTORS.videoInfoContainer);
             let uploadDate = '?';
             if (infoContainer) {
                 const infoSpans = infoContainer.querySelectorAll(DOM.SELECTORS.videoInfoSpan);
                 // Look for a span containing "ago" or a date pattern
                 for (let i = infoSpans.length - 1; i >= 0; i--) {
                     const text = infoSpans[i].textContent?.trim();
                     if (text && (text.includes('ago') || text.includes('Streamed') || text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}/i))) {
                         uploadDate = text;
                         break;
                     }
                 }
                 // Fallback if no specific pattern matched (e.g., 3rd span)
                 if (uploadDate === '?' && infoSpans.length >= 3) {
                     uploadDate = infoSpans[2]?.textContent?.trim() || '?';
                 }
             }

            const menuButtonRef = el.querySelector(DOM.SELECTORS.menuButton);

            if (menuButtonRef) {
                 const videoEntry = {
                    title,
                    duration,
                    uploadDate,
                    menuButtonElement: menuButtonRef,
                    originalIndex: index,
                    id: title + duration + uploadDate // Create a simple ID for tracking
                };
                 ns.videoData.push(videoEntry);
                UI.addVideoToList(videoEntry, ns.videoData.length - 1, listContainer); // Pass current index
            } else {
                console.warn(`Skipping video at index ${index} ("${title}") - Could not find menu button.`);
            }
        });

        console.log(`Scraped ${ns.videoData.length} videos with menu buttons.`);
         // Update select all checkbox state after populating
         UI.updateSelectAllCheckboxState();
         return ns.videoData.length; // Return count
    }

    // --- Event Listener Setup ---
    function setupModalEventListeners() {
        const elements = UI.getElements();
        if (!elements.modal) return; // Modal not created

        // Close Buttons
        elements.modal.querySelector('.yt-spec-dialog-layout__dialog-header-container button[aria-label="Close"]')?.addEventListener('click', UI.removeModal);
        elements.overlay.addEventListener('click', (event) => {
            if (event.target === elements.overlay) UI.removeModal();
        });

        // Page Navigation
        elements.configureButton.addEventListener('click', () => UI.showPage(UI.PAGE2_ID));
        elements.backButton.addEventListener('click', () => UI.showPage(UI.PAGE1_ID));

        // Search Filter
        elements.searchInput.addEventListener('input', (e) => UI.filterList(e.target.value));
        elements.searchInput.addEventListener('search', (e) => UI.filterList(e.target.value)); // Handle clear button if present

         // Select All / None
         elements.selectAllCheckbox.addEventListener('change', (e) => {
             UI.toggleAllVisible(e.target.checked);
         });
         elements.selectNoneButton.addEventListener('click', () => {
             UI.toggleAllVisible(false); // Uncheck all visible
             elements.selectAllCheckbox.checked = false; // Ensure master is unchecked
             elements.selectAllCheckbox.indeterminate = false;
         });
         // Update select all when individual items change
         elements.videoList.addEventListener('change', (e) => {
             if (e.target.matches(`.${UI.VIDEO_ITEM_CLASS} input[type="checkbox"]`)) {
                 UI.updateSelectAllCheckboxState();
             }
         });


        // Action Radio Buttons -> Show/Hide Playlist Config
        Object.values(elements.actionRadios).forEach(radio => {
            radio.addEventListener('change', () => {
                const showPlaylistConfig = elements.actionRadios.add_to_new_playlist.checked;
                elements.playlistConfigDiv.style.display = showPlaylistConfig ? '' : 'none';
                ns.config.action = showPlaylistConfig ? 'add_to_new_playlist' : 'add_to_queue';
            });
        });

        // Run Button
        elements.runButton.addEventListener('click', executeActions);
    }


    // --- Action Execution ---
    async function executeActions() {
        if (ns.isRunning && ns.videoData.length == 0 ) { // Check if already running, but allow rerun if stopped
             console.warn("Execution already in progress or starting.");
             return;
         }
         ns.isRunning = true; // Set running flag *again* here for execution phase
         ns.stopRequested = false; // Reset stop flag for new run
        console.log("--- Starting Action Execution ---");

        const elements = UI.getElements();
        elements.runButton.disabled = true;
        elements.runButton.textContent = 'Running...';
        elements.backButton.disabled = true;
        // Add a Stop Button? Maybe replace Run button text/functionality
        // elements.runButton.textContent = 'Stop';
        // elements.runButton.onclick = () => { ns.stopRequested = true; console.log("Stop requested..."); }; // Simple stop


        // 1. Read Final Config from UI
        Object.keys(ns.config.delays).forEach(key => {
             // Map config key to element ID (adjust if needed)
            const inputId = `delay-${key.replace(/_/g, '-')}`;
            const inputElement = elements.delayInputs[key]; // Access via stored refs
            if (inputElement) {
                const val = parseInt(inputElement.value, 10);
                ns.config.delays[key] = isNaN(val) || val < 0 ? ns.config.DEFAULT_DELAYS[key] : val;
            } else {
                console.warn(`Delay input not found for key: ${key} (ID: ${inputId})`);
                 ns.config.delays[key] = ns.config.DEFAULT_DELAYS[key]; // Fallback
            }
        });
        const randomPercentVal = parseInt(elements.randomnessInput.value, 10);
        ns.config.randomnessPercent = isNaN(randomPercentVal) || randomPercentVal < 0 || randomPercentVal > 100 ? ns.config.DEFAULT_RANDOMNESS_PERCENT : randomPercentVal;

        ns.config.action = elements.actionRadios.add_to_new_playlist.checked ? 'add_to_new_playlist' : 'add_to_queue';

        if (ns.config.action === 'add_to_new_playlist') {
            ns.config.newPlaylistName = elements.playlistNameInput.value.trim();
            ns.config.newPlaylistVisibility = elements.visibilitySelect.value;
            if (!ns.config.newPlaylistName) {
                alert("Please enter a name for the new playlist.");
                elements.runButton.disabled = false;
                elements.runButton.textContent = 'Run Actions';
                elements.backButton.disabled = false;
                ns.isRunning = false;
                return;
            }
        }

        console.log("Running with config:", JSON.parse(JSON.stringify(ns.config))); // Log deep copy

        // 2. Get Selected Videos
        const allVideoItems = elements.videoList.querySelectorAll(`.${UI.VIDEO_ITEM_CLASS}`);
        const selectedVideos = [];
        allVideoItems.forEach(itemDiv => {
            const checkbox = itemDiv.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked && itemDiv.style.display !== 'none') {
                const videoIndex = parseInt(itemDiv.getAttribute('data-video-index'), 10);
                 // Ensure data exists for this index
                 if (!isNaN(videoIndex) && ns.videoData[videoIndex]) {
                     // Only add if it hasn't already succeeded (check class)
                     if (!itemDiv.classList.contains('yt-bulk-item-done')) {
                          selectedVideos.push({
                             index: videoIndex,
                             element: itemDiv,
                             data: ns.videoData[videoIndex]
                         });
                     }
                 } else {
                      console.warn(`Could not find video data for index ${videoIndex} from list item.`);
                 }
            }
        });

        if (selectedVideos.length === 0) {
            alert("No videos selected or visible matching the current filter that haven't already succeeded.");
            elements.runButton.disabled = false;
            elements.runButton.textContent = 'Run Actions';
            elements.backButton.disabled = false;
             ns.isRunning = false;
            return;
        }

        console.log(`Preparing to process ${selectedVideos.length} selected videos.`);
        UI.updateStatus(`Processing 0/${selectedVideos.length}...`);

        // 3. Iterate and Perform Actions
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedVideos.length; i++) {
            // Check if stop was requested
            if (ns.stopRequested) {
                 console.log("Stop requested. Halting execution.");
                 UI.updateStatus(`Stopped. Processed ${i}/${selectedVideos.length}. Success: ${successCount}, Failed: ${failCount}.`);
                 break; // Exit the loop
             }

            const item = selectedVideos[i];
            UI.updateStatus(`Processing ${i + 1}/${selectedVideos.length}: ${item.data.title}`);
            UI.updateListItemStatus(item.element, 'processing');
            let actionSuccess = false;

            try {
                if (ns.config.action === 'add_to_queue') {
                    actionSuccess = await Actions.performAddToQueue(
                        item.data.menuButtonElement,
                        { ...ns.config.delays, randomnessPercent: ns.config.randomnessPercent }
                    );
                } else if (ns.config.action === 'add_to_new_playlist') {
                    actionSuccess = await Actions.performAddToPlaylist(
                        item.data.menuButtonElement,
                        { name: ns.config.newPlaylistName, visibility: ns.config.newPlaylistVisibility },
                        { ...ns.config.delays, randomnessPercent: ns.config.randomnessPercent }
                    );
                }
            } catch (e) {
                console.error(`Unexpected error during action for "${item.data.title}":`, e);
                actionSuccess = false;
            }

            if (actionSuccess) {
                console.log(`   Success for "${item.data.title}"`);
                UI.updateListItemStatus(item.element, 'done');
                successCount++;
            } else {
                console.warn(`   Failed for "${item.data.title}"`);
                UI.updateListItemStatus(item.element, 'failed');
                failCount++;
            }

            // Wait between videos, unless it's the last one or stop requested
             if (i < selectedVideos.length - 1 && !ns.stopRequested) {
                 await Utils.sleepRandom(ns.config.delays.betweenVideos, ns.config.randomnessPercent);
             }
        }

        // 4. Completion
        const finalMessage = ns.stopRequested
             ? `Stopped. Processed ${successCount + failCount}/${selectedVideos.length}. Success: ${successCount}, Failed: ${failCount}.`
             : `Finished. Processed ${selectedVideos.length}. ${successCount} succeeded, ${failCount} failed.`;

        console.log(finalMessage);
        UI.updateStatus(finalMessage);
        alert(finalMessage);

        // Restore Run button state
        elements.runButton.textContent = 'Run Actions';
        elements.runButton.disabled = false;
         elements.backButton.disabled = false;
         ns.isRunning = false; // Reset running flag
         ns.stopRequested = false; // Reset stop flag
        // Restore original Run button click handler if it was changed for Stop functionality
        // elements.runButton.onclick = executeActions;
    }

    // --- Global Access ---
    ns.init = init; // Expose init function
    ns.stopExecution = () => { // Expose a stop function
        if (ns.isRunning) {
            ns.stopRequested = true;
             console.log("Stop request received via stopExecution().");
        }
     };


})(); // End IIFE for main

console.log("Loaded: main.js");

// Trigger initialization (The loader bookmarklet should ideally do this)
if (window.ytBulkActions && typeof window.ytBulkActions.init === 'function') {
     // Optional: Small delay before init to ensure DOM might be slightly more ready
     // setTimeout(window.ytBulkActions.init, 100);
     // Or call directly if loader guarantees order
     window.ytBulkActions.init();
 } else {
     console.error("YT Bulk Actions: Main init function not found after script loading!");
 }