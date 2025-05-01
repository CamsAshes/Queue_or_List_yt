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

// Loader Script (Before Minification/Encoding)
javascript:(function() {
    const SCRIPT_ID_PREFIX = 'yt-bulk-action-script-';
    const NAMESPACE = 'ytBulkActions'; // Match the namespace used in the scripts
    const SCRIPT_URLS = [
        'YOUR_RAW_URL_FOR_utils.js',
        'YOUR_RAW_URL_FOR_dom.js',
        'YOUR_RAW_URL_FOR_actions.js',
        'YOUR_RAW_URL_FOR_modal_ui.js',
        'YOUR_RAW_URL_FOR_main.js'
        // Add more URLs here if you split further
    ];

    // Check if already loaded/running
    if (window[NAMESPACE] && window[NAMESPACE].isRunning) {
        console.warn('YT Bulk Actions script is already running.');
        alert('YT Bulk Actions script is already running or the modal is open.');
        return;
    }
     // Clear previous modal if somehow stuck
     const existingModal = document.getElementById('yt-bulk-action-modal');
     const existingOverlay = document.getElementById('yt-bulk-action-overlay');
     if(existingModal) existingModal.remove();
     if(existingOverlay) existingOverlay.remove();
     // Clear previous scripts just in case of partial load failure
     SCRIPT_URLS.forEach((url, index) => {
        const scriptId = SCRIPT_ID_PREFIX + index;
        document.getElementById(scriptId)?.remove();
     });


    console.log('YT Bulk Actions: Loader started.');
    let loadedCount = 0;

    function loadScript(index) {
        if (index >= SCRIPT_URLS.length) {
            // All scripts loaded, initialize
            console.log('YT Bulk Actions: All scripts loaded. Initializing...');
            if (window[NAMESPACE] && typeof window[NAMESPACE].init === 'function') {
                try {
                 window[NAMESPACE].init();
                } catch (initError) {
                     console.error("Error during initialization:", initError);
                     alert("Error during script initialization. Check console.");
                }
            } else {
                console.error('YT Bulk Actions: Initialization function (window.'+NAMESPACE+'.init) not found!');
                 alert('YT Bulk Actions: Failed to find initialization function after loading scripts.');
            }
            return;
        }

        const url = SCRIPT_URLS[index];
        const scriptId = SCRIPT_ID_PREFIX + index;

        // Skip if element with same ID already exists (e.g., from previous failed attempt)
        if (document.getElementById(scriptId)) {
             console.warn(`Script element ${scriptId} already exists, skipping reload.`);
             loadScript(index + 1); // Try loading next one
             return;
         }


        const script = document.createElement('script');
        script.id = scriptId;
        script.src = url + '?ts=' + Date.now(); // Cache busting
        script.async = false; // Try to enforce some order, though Promises are better

        script.onload = () => {
            console.log(`Loaded: ${url}`);
            loadedCount++;
            loadScript(index + 1); // Load next script
        };

        script.onerror = () => {
            console.error(`Failed to load script: ${url}`);
            alert(`Failed to load a required script file: ${url.split('/').pop()}. Cannot continue.`);
             // Clean up potentially loaded scripts? Or leave for debug? Let's leave them.
        };

        document.head.appendChild(script);
    }

    // Start loading the first script
    loadScript(0);

})();