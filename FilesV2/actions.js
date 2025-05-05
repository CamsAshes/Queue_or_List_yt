/* eslint-disable no-alert */
/* eslint-disable no-console */
// --- actions.js ---
// Contains functions to perform the specific YouTube actions like adding to queue or playlist.

(function ytBulkActionsWrapper() {
  // Ensure the global namespace exists
  window.ytBulkActions = window.ytBulkActions || {};
  const ns = window.ytBulkActions;

  // Avoid redefining if already loaded
  if (ns.Actions) {
    console.log('Actions module already defined.');
    return;
  }

  // --- Dependency Check ---
  // Ensure Utils and DOM modules are loaded before defining Actions
  if (!ns.Utils || !ns.DOM) {
    console.error(
      'Actions Module Error: Missing required dependencies (Utils or DOM).'
    );
    alert('Actions Module failed to load dependencies. Check console.');
    // Optionally, create a dummy Actions object to prevent further errors
    ns.Actions = {
      performAddToQueue: async () => false,
      performAddToPlaylist: async () => false,
    };
    return;
  }
  // --- End Dependency Check ---

  console.log('Defining: Actions Module');
  ns.Actions = (() => {
    // IIFE for encapsulation
    const { Utils } = ns;
    const { DOM } = ns;

    /**
     * Performs the 'Add to Queue' action for a single video.
     * Checks the stopRequested flag between steps.
     * @param {Element} menuButtonElement - The 3-dot menu button element for the video.
     * @param {object} delays - Contains delay settings (e.g., afterMenuClick, afterAddClick, randomnessPercent).
     * @returns {Promise<boolean>} True if the action likely succeeded, false otherwise or if stopped.
     */
    async function performAddToQueue(menuButtonElement, delays) {
      if (ns.stopRequested) {
        console.log('Action stopped before starting AddToQueue.');
        return false;
      }
      console.log('  Action: Adding to Queue...');

      // 1. Click menu button
      if (!Utils.simulateClick(menuButtonElement, 'Menu Button')) return false;
      await Utils.sleepRandom(delays.afterMenuClick, delays.randomnessPercent);
      if (ns.stopRequested) {
        console.log('Action stopped after menu click.');
        return false;
      }

      // 2. Find and click "Add to queue"
      const btn = DOM.findAddToQueueButton();
      if (!btn) {
        console.warn("Could not find 'Add to Queue' button in menu.");
        return false;
      }
      if (!Utils.simulateClick(btn, '"Add to Queue" Menu Item')) return false;

      // 3. Wait after the final action
      await Utils.sleepRandom(delays.afterAddClick, delays.randomnessPercent);

      // Return true only if not stopped during the final wait (unlikely but possible)
      return !ns.stopRequested;
    }

    /**
     * Performs the 'Add to New Playlist' action for a single video.
     * Checks the stopRequested flag between steps.
     * @param {Element} menuButtonElement - The 3-dot menu button element for the video.
     * @param {object} playlistDetails - Contains { name: string, visibility: 'Public'|'Unlisted'|'Private' }.
     * @param {object} delays - Contains delay settings (e.g., afterMenuClick, betweenDialogActions, afterAddClick, randomnessPercent).
     * @returns {Promise<boolean>} True if the action likely succeeded, false otherwise or if stopped.
     */
    async function performAddToPlaylist(
      menuButtonElement,
      playlistDetails,
      delays
    ) {
      if (ns.stopRequested) {
        console.log('Action stopped before starting AddToPlaylist.');
        return false;
      }
      console.log(
        `  Action: Add to New Playlist "${playlistDetails.name}" (${playlistDetails.visibility})...`
      );

      // Step 1: Click menu
      console.log('   Step 1: Click menu...');
      if (!Utils.simulateClick(menuButtonElement, 'Menu Button')) return false;
      await Utils.sleepRandom(delays.afterMenuClick, delays.randomnessPercent);
      if (ns.stopRequested) {
        console.log('Action stopped after menu click.');
        return false;
      }

      // Step 2: Click "Save to playlist"
      console.log('   Step 2: Click "Save to playlist"...');
      const saveBtn = DOM.findSaveToPlaylistButton();
      if (!saveBtn || !Utils.simulateClick(saveBtn, '"Save to Playlist"'))
        return false;
      await Utils.sleepRandom(
        delays.betweenDialogActions,
        delays.randomnessPercent
      );
      if (ns.stopRequested) {
        console.log('Action stopped after Save click.');
        return false;
      }

      // Step 3: Click "New playlist"
      console.log('   Step 3: Click "New playlist"...');
      let newPlBtn = DOM.findNewPlaylistButton();
      // Add extra wait/check if dialog loads slowly
      if (!newPlBtn) {
        console.warn(
          'New Playlist button not immediately found, waiting slightly longer...'
        );
        await Utils.sleepRandom(
          delays.betweenDialogActions,
          delays.randomnessPercent
        ); // Extra wait
        if (ns.stopRequested) return false;
        newPlBtn = DOM.findNewPlaylistButton(); // Try again
        if (!newPlBtn) {
          console.error('Failed to find New Playlist button after extra wait.');
          return false;
        }
      }
      if (!Utils.simulateClick(newPlBtn, '"New Playlist"')) return false;
      await Utils.sleepRandom(
        delays.betweenDialogActions,
        delays.randomnessPercent
      );
      if (ns.stopRequested) {
        console.log('Action stopped after New Playlist click.');
        return false;
      }

      // Step 4: Enter name
      console.log(`   Step 4: Enter name "${playlistDetails.name}"...`);
      const nameInput = DOM.findPlaylistNameInput();
      if (!nameInput) return false; // Error logged in DOM module
      nameInput.value = playlistDetails.name;
      // Dispatch input event to trigger potential validation/UI updates
      nameInput.dispatchEvent(
        new Event('input', { bubbles: true, cancelable: true })
      );
      await Utils.sleepRandom(
        delays.betweenDialogActions / 2,
        delays.randomnessPercent
      ); // Shorter wait after typing
      if (ns.stopRequested) {
        console.log('Action stopped after entering name.');
        return false;
      }

      // Step 5: Set Visibility (if needed)
      const targetVisibility = playlistDetails.visibility || 'Private';
      if (targetVisibility !== 'Private') {
        // Assuming Private is default
        console.log(`   Step 5a: Click visibility trigger...`);
        const visTrig = DOM.findVisibilityTrigger();
        if (!visTrig || !Utils.simulateClick(visTrig, 'Visibility Trigger'))
          return false;
        await Utils.sleepRandom(
          delays.betweenDialogActions,
          delays.randomnessPercent
        );
        if (ns.stopRequested) {
          console.log('Action stopped after visibility trigger click.');
          return false;
        }

        console.log(`   Step 5b: Click "${targetVisibility}" option...`);
        const visOpt = DOM.findVisibilityOption(targetVisibility);
        if (
          !visOpt ||
          !Utils.simulateClick(visOpt, `Visibility "${targetVisibility}"`)
        ) {
          console.warn(
            'Failed visibility select. Attempting to dismiss dropdown.'
          );
          try {
            document.body.click();
            await Utils.sleepRandom(200, 0);
          } catch (e) {
            console.error('Error while attempting to dismiss dropdown:', e); // Click outside
          }
          return false; // Fail the action
        }
        await Utils.sleepRandom(
          delays.betweenDialogActions / 2,
          delays.randomnessPercent
        );
        if (ns.stopRequested) {
          console.log('Action stopped after selecting visibility.');
          return false;
        }
      } else {
        console.log(
          '   Step 5: Skip visibility change (using default Private).'
        );
      }

      // Step 6: Click Create
      console.log('   Step 6: Click "Create"...');
      const createBtn = DOM.findCreatePlaylistSubmitButton();
      if (!createBtn) return false; // Error logged in DOM module
      // Check if button is disabled (common if name is empty/invalid)
      if (
        createBtn.disabled ||
        (createBtn.hasAttribute('aria-disabled') &&
          createBtn.getAttribute('aria-disabled') !== 'false')
      ) {
        console.warn(
          '"Create" button is disabled. Check playlist name or UI state.'
        );
        try {
          document.body.click();
          await Utils.sleepRandom(200, 0);
        } catch (e) {
          console.error('Error while attempting to dismiss dialog:', e); // Log the error
        } // Try to dismiss dialog
        return false;
      }
      if (!Utils.simulateClick(createBtn, '"Create" Playlist Button'))
        return false;
      console.log('   Playlist create action initiated.');
      await Utils.sleepRandom(delays.afterAddClick, delays.randomnessPercent); // Wait after the final click

      return !ns.stopRequested;
    }

    // --- Expose public action functions ---
    return {
      performAddToQueue,
      performAddToPlaylist, // This currently performs NEW playlist creation
      // We would add performAddToExistingPlaylists here later if needed
    };
  })(); // End of IIFE for Actions module
})(); // End of wrapper IIFE
