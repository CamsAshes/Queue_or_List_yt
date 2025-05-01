// --- youtube_actions.js ---
(function() {
    "use strict";
    console.log("Loading: youtube_actions.js");

    if (window.ytBulkActionsActions) {
        console.log("Actions module already defined.");
        return;
    }

    window.ytBulkActionsActions = (function() {
        "use strict";

        // Dependencies
        const Utils = window.ytBulkActionsUtils;
        const DOM = window.ytBulkActionsDOM;

        if (!Utils || !DOM) {
            console.error("Action module failed to load: Dependencies missing.");
            alert("Action module failed to load. Check console.");
            return {};
        }

        /**
         * Performs the 'Add to Queue' action.
         * @param {Element} menuButtonElement - The original menu button element.
         * @param {object} delays - { afterMenuClick, afterAddClick, randomnessPercent }
         * @returns {Promise<boolean>} Success status.
         */
        async function performAddToQueue(menuButtonElement, delays) {
            console.log("  Performing Add to Queue...");
            if (!Utils.simulateClick(menuButtonElement, 'Menu Button')) return false;
            await Utils.sleepRandom(delays.afterMenuClick, delays.randomnessPercent);

            const addToQueueButton = DOM.findAddToQueueButton();
            if (!addToQueueButton) return false;

            if (!Utils.simulateClick(addToQueueButton, '"Add to Queue" Menu Item')) return false;
            await Utils.sleepRandom(delays.afterAddClick, delays.randomnessPercent); // Wait after final action
            return true;
        }

        /**
         * Performs the 'Add to New Playlist' action.
         * @param {Element} menuButtonElement - The original menu button element.
         * @param {object} playlistDetails - { name: string, visibility: 'Public'|'Unlisted'|'Private' }
         * @param {object} delays - Includes { ..., betweenDialogActions, randomnessPercent }
         * @returns {Promise<boolean>} Success status.
         */
        async function performAddToPlaylist(menuButtonElement, playlistDetails, delays) {
            console.log(`  Performing Add to New Playlist "${playlistDetails.name}" (${playlistDetails.visibility})...`);

            // Step 1: Open main menu
            console.log("   Step 1: Clicking menu button...");
            if (!Utils.simulateClick(menuButtonElement, 'Menu Button')) return false;
            await Utils.sleepRandom(delays.afterMenuClick, delays.randomnessPercent);

            // Step 2: Click "Save to playlist"
             console.log('   Step 2: Finding and clicking "Save to playlist"...');
            const saveToPlaylistButton = DOM.findSaveToPlaylistButton();
             if (!saveToPlaylistButton) return false; // Error logged in findMenuItemByText
            if (!Utils.simulateClick(saveToPlaylistButton, '"Save to Playlist" Menu Item')) return false;
            await Utils.sleepRandom(delays.betweenDialogActions, delays.randomnessPercent); // Wait for dialog

            // Step 3: Click "New playlist"
             console.log('   Step 3: Finding and clicking "New playlist" button...');
            const newPlaylistButton = DOM.findNewPlaylistButton();
             if (!newPlaylistButton) return false; // Error logged in findElementInDialog
            if (!Utils.simulateClick(newPlaylistButton, '"New Playlist" Button')) return false;
            await Utils.sleepRandom(delays.betweenDialogActions, delays.randomnessPercent); // Wait for create fields

            // Step 4: Enter Playlist Name
             console.log(`   Step 4: Finding and entering playlist name "${playlistDetails.name}"...`);
            const nameInput = DOM.findPlaylistNameInput();
             if (!nameInput) return false; // Error logged in findElementInDialog
            nameInput.value = playlistDetails.name;
            nameInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); // Trigger change detection
            await Utils.sleepRandom(delays.betweenDialogActions, delays.randomnessPercent);

            // Step 5: Set Visibility (Only if NOT Private)
            const targetVisibility = playlistDetails.visibility || 'Private'; // Default just in case
            // Check current visibility if possible? YT UI might not expose this easily before opening dropdown.
            // Assuming 'Private' is the default after clicking 'New Playlist' - this is common YT behavior.
            if (targetVisibility !== 'Private') {
                console.log(`   Step 5a: Finding and clicking visibility trigger (setting to ${targetVisibility})...`);
                const visibilityTrigger = DOM.findVisibilityTrigger();
                if (!visibilityTrigger || !Utils.simulateClick(visibilityTrigger, 'Visibility Dropdown Trigger')) return false;
                await Utils.sleepRandom(delays.betweenDialogActions, delays.randomnessPercent);

                console.log(`   Step 5b: Finding and clicking "${targetVisibility}" option...`);
                const visibilityOption = DOM.findVisibilityOption(targetVisibility);
                 if (!visibilityOption || !Utils.simulateClick(visibilityOption, `Visibility Option "${targetVisibility}"`)) {
                     console.warn("Failed to select visibility option. Attempting to close dropdown.");
                     try { document.body.click(); } catch(e){} // Attempt to dismiss
                     return false;
                 }
                await Utils.sleepRandom(delays.betweenDialogActions, delays.randomnessPercent);
            } else {
                console.log("   Step 5: Skipping visibility change (already default Private).");
            }

            // Step 6: Click Create
             console.log('   Step 6: Finding and clicking "Create" button...');
            const createButton = DOM.findCreatePlaylistSubmitButton();
             if (!createButton) return false; // Error logged in findElementInDialog
            if (createButton.disabled || createButton.hasAttribute('aria-disabled') && createButton.getAttribute('aria-disabled') !== 'false') {
                 console.warn('"Create" button is disabled. Check playlist name validity or UI state.');
                 return false;
             }
            if (!Utils.simulateClick(createButton, '"Create" Playlist Button')) return false;
             console.log('   Playlist creation initiated.');
            await Utils.sleepRandom(delays.afterAddClick, delays.randomnessPercent); // Wait after final action

            // Note: True success depends on YT backend. We can only confirm clicks dispatched.
            return true;
        }

        // --- Expose Public Methods ---
        return {
            performAddToQueue,
            performAddToPlaylist
        };

    })(); // End inner IIFE

    console.log("Loaded: youtube_actions.js");
})(); // End outer IIFE