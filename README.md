# Queue_or_List_yt

***DO NOT USE YET, STILL IN TESTING PHASE***

## What is this?

This is a collection of JavaScript files designed to be loaded via a browser bookmarklet. When activated on a YouTube channel's video list page or a playlist page, it:

1.  Automatically scrolls down to load all available videos on the page.
2.  Scrapes information (title, duration, upload date) about each video.
3.  Presents a modal window listing these videos with checkboxes.
4.  Allows filtering the list by video title.
5.  Provides a configuration page to set action delays and choose an action:
    *   Add selected videos to the playback **Queue**.
    *   Add selected videos to a **New Playlist** (prompting for name and visibility).
6.  Executes the chosen action on the selected videos sequentially.

## How it Works

The tool uses a **loader bookmarklet** approach because the full script is too large for a standard bookmarklet URL. The bookmarklet dynamically loads several JavaScript files (`utils.js`, `dom.js`, `actions.js`, `modal_ui.js`, `main.js`) from a hosted location. These files contain the logic for scrolling, scraping, UI creation, and action execution.

## How to Use

**1. Host the Files:**

*   You need to host the `.js` files from this repository on a publicly accessible HTTPS server.
*   **Recommended:** Fork this repository, enable GitHub Pages for your fork (Settings -> Pages -> Deploy from a branch), and use the resulting `{https://<your-username>.github.io/<your-repo-name>/Files/} + {FileName.js}` URLs.
*   Alternatively, you can use the "Raw" URLs from GitHub, but GitHub Pages is generally more reliable for this purpose.

**2. Create the Loader Bookmarklet:**

*   Copy the `loader.js` code from this repository.
*   **Crucially:** Replace the placeholder URLs (`'YOUR_RAW_URL_FOR_...js'`) within the `SCRIPT_URLS` array in the loader code with the actual URLs where *you* are hosting the files (from Step 1).
*   Create a new bookmark in your browser.
*   Name it something descriptive (e.g., `YT Bulk Add`).
*   Paste the **entire modified** `loader.js` code (starting with `javascript:`) into the URL/Address field of the bookmark.
*   Save the bookmark.

**3. Run the Tool:**

*   Navigate to a YouTube channel's video page (e.g., `youtube.com/@ChannelName/videos`) or a specific playlist page in your browser.
*   **I recommend going to the channel's FULL UPLOADS page by making a NEW bookmarklet (Navigate to channel page, refresh for good measure, then click the bookmarklet):
*     javascript:void((function(){var channelID = ytInitialData.metadata.channelMetadataRenderer.externalId;var playlistURL = "https://www.youtube.com/playlist?list=UU" + channelID.substring(2);window.location.href = playlistURL;})());
*   Wait for the initial videos to load.
*   Click the main loader bookmarklet you created.
*   The script will load, start scrolling the page down, scrape the videos, and then display the modal interface.
*   Follow the instructions in the modal: select videos, filter if needed, configure the action on the second page, and click "Run".

## Warnings & Disclaimers

*   **YouTube Changes:** YouTube frequently updates its website structure (HTML, CSS classes, element IDs). These changes **will likely break this script** without warning. You may need to inspect the page elements and update the selectors in `dom.js` to fix it.
*   **Rate Limiting:** Performing too many actions too quickly (especially playlist creation) might trigger YouTube's anti-automation measures. The configurable delays help, but use cautiously. Start with longer delays.
*   **Terms of Service:** Automating interactions on YouTube *may* violate their Terms of Service. Use this tool responsibly and at your own risk.
*   **No Guarantees:** This tool is provided as-is, with no guarantee of functionality or future updates.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
