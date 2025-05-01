/*REMOVE WHEN DONE

DO NOT USE THIS FILE AS-IS FOR YOUR BOOKMARKLET. Pretty, unminified javascript is likely to break in a url
If you want to use pretty file for writing in your own page's URLs, remove these top comment lines 
(everything between the forward-slash+apostrophe and apostrophe+backslash) and use a Minifier/Uglifier
like Terser: https://terser.org/ (tool can be found at (https://try.terser.org/). For minifier options,
paste the everything between the bottom-level brackets just below into terser's tool:

*Start*

{
  compress: {
    drop_console: false, // Keep console for debugging initially (set to true for final smallest size AFTER testing)
    drop_debugger: true,
    unused: true,
    dead_code: true
    // Keep other compress defaults unless issues arise
  },
  mangle: {
    toplevel: false, // IMPORTANT: Keep false to protect window.ytBulkActions... names
    properties: false // IMPORTANT: Keep false to protect DOM property access
  },
  format: { // Terser v5+ uses 'format', older might use 'output'
    comments: false, // Remove all comments
    beautify: false,
    webkit: true,   // Optional: For older WebKit compatibility
    safari10: true // Optional: For older Safari compatibility
  },
  sourceMap: false // Set to false for final hosted files, true during testing if needed
}

*End*

Then, copy the output on the left and paste into the new bookmark page URL field, fully replacing
anything already there and entering something uniquely identifying as the name.

***If you go this route, you MUST re-add the "javascript:" identifier at the beginning of the ***
***minified output. Tarser will remove this, but it IS NEEDED for the browser to run as script***

REMOVE WHEN DONE*/

javascript:(function() {
    "use strict";
    const SCRIPT_ID_PREFIX = 'yt-bulk-action-script-';
    const NAMESPACE = 'ytBulkActions'; // The global object name used by the scripts

    // --- USER CONFIGURATION ---
    // IMPORTANT: Replace this with the URL path to where your JS files are hosted.
    //            Must end with a forward slash '/'
    // Example GitHub Pages: 'https://yourusername.github.io/your-repo-name/'
    // Example Raw GitHub:   'https://raw.githubusercontent.com/yourusername/your-repo-name/main/'
    const BASE_SCRIPT_URL = 'YOUR_BASE_URL_HERE/';

    // List of the script filenames IN THE ORDER they should be loaded
    const SCRIPT_FILENAMES = [
        'Files/utils.js',
        'Files/dom.js', // Use 'dom.js' if you renamed it, otherwise 'youtube_dom.js'
        'Files/actions.js', // Use 'actions.js' if you renamed it, otherwise 'youtube_actions.js'
        'Files/modal_ui.js',
        'Files/main.js'
    ];
    // --- END USER CONFIGURATION ---

    // Construct full URLs
    const SCRIPT_URLS = SCRIPT_FILENAMES.map(filename => `${BASE_SCRIPT_URL}${filename}`);
    // Alternative for older browser compatibility (if needed):
    // const SCRIPT_URLS = SCRIPT_FILENAMES.map(function(filename) { return BASE_SCRIPT_URL + filename; });

    // --- Rest of the loader logic (unchanged) ---

    // Check if already running or modal exists
    if (window[NAMESPACE] && window[NAMESPACE].isRunning) {
        console.warn('YT Bulk Actions script is already running.');
        alert('YT Bulk Actions script is already running or the modal is open.');
        return;
    }
    // Clear previous modal if somehow stuck
    const existingModal = document.getElementById('yt-bulk-action-modal'); // Use constant from UI module if possible later
    const existingOverlay = document.getElementById('yt-bulk-action-overlay');
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();
    // Clear previous scripts just in case of partial load failure
    SCRIPT_URLS.forEach((url, index) => { // Use SCRIPT_URLS here as IDs are based on index
       const scriptId = SCRIPT_ID_PREFIX + index;
       document.getElementById(scriptId)?.remove();
    });

    console.log('YT Bulk Actions: Loader started.');
    let scriptsLoadedSuccessfully = 0; // Track successful loads

    function loadScript(index) {
        if (index >= SCRIPT_URLS.length) {
            // All scripts attempted, check if all succeeded before initializing
            if (scriptsLoadedSuccessfully === SCRIPT_URLS.length) {
                console.log('YT Bulk Actions: All scripts loaded successfully. Initializing...');
                if (window[NAMESPACE] && typeof window[NAMESPACE].init === 'function') {
                    try {
                        window[NAMESPACE].init();
                    } catch (initError) {
                        console.error("Error during initialization:", initError);
                        alert("Error during script initialization. Check console.");
                    }
                } else {
                    console.error(`YT Bulk Actions: Initialization function (window.${NAMESPACE}.init) not found!`);
                    alert(`YT Bulk Actions: Failed to find initialization function after loading scripts.`);
                }
            } else {
                 console.error(`YT Bulk Actions: Not all scripts loaded successfully (${scriptsLoadedSuccessfully}/${SCRIPT_URLS.length}). Initialization aborted.`);
                 alert(`YT Bulk Actions: Failed to load all required scripts. Check console for errors.`);
            }
            return;
        }

        const url = SCRIPT_URLS[index];
        const scriptId = SCRIPT_ID_PREFIX + index;

        // Skip creating element if it somehow still exists (double protection)
        if (document.getElementById(scriptId)) {
             console.warn(`Script element ${scriptId} still exists, skipping reload.`);
             loadScript(index + 1); // Try loading next one
             return;
         }

        const script = document.createElement('script');
        script.id = scriptId;
        // Add cache-busting query parameter
        const cacheBuster = '?ts=' + Date.now();
        script.src = url + cacheBuster;
        script.async = false; // Try to enforce loading order

        script.onload = () => {
            console.log(`Successfully loaded: ${url}`);
            scriptsLoadedSuccessfully++;
            loadScript(index + 1); // Load next script
        };

        script.onerror = () => {
            console.error(`Failed to load script: ${url}`);
            // Don't immediately alert, let the final check handle it
            loadScript(index + 1); // Still try to load the next script
        };

        console.log(`Attempting to load: ${url}`);
        document.head.appendChild(script);
    }

    // Start loading the first script
    loadScript(0);

})();
