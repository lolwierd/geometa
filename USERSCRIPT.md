# GeoMeta Userscripts

This document covers both userscripts available in the GeoMeta project:

- **GeoMeta Collector** – collects GeoGuessr round data and sends it to your local GeoMeta Gallery backend.
- **GeoMeta Enhanced Gallery** – captures LearnableMeta screenshots and lets you browse them in an in-page gallery.

---

## GeoMeta Collector Userscript

### Overview

The **GeoMeta Collector** userscript automatically collects location data while you play GeoGuessr and sends it to your backend for processing and storage.

**Key Features**

- 🔄 Automatic detection of round endings in GeoGuessr
- 📡 Direct integration with your local GeoMeta Gallery backend
- 🔔 Smart notifications showing collection status
- ⚙️ Configurable settings via Tampermonkey menu
- 🎮 Support for all game modes (regular, challenges, live challenges)
- 🐛 Debug mode for troubleshooting

### Installation

**Prerequisites**

- Tampermonkey (Chrome) or Violentmonkey (Firefox)
- GeoMeta Gallery backend running locally (default `http://localhost:3000`)

**Steps**

1. Install Tampermonkey or Violentmonkey.
2. In the extension dashboard, create a new userscript and delete the template.
3. Copy the contents of `userscript.js` from this repository and paste into the editor.
4. Save the script – it should appear as “GeoMeta Collector” and be enabled.

### Configuration

Open the Tampermonkey menu → **GeoMeta Collector** to configure:

- **API URL** – default `http://localhost:3000`
- **Toggle Collection** – enable/disable automatic collection
- **Toggle Notifications** – show success/info notifications (errors always show)
- **Toggle Debug Mode** – verbose console logging
- **Test Collection** – send a test location to verify the setup
- **Show Status** – display current configuration and connection state

### How It Works

1. **Event Detection** – uses the GeoGuessr Event Framework to detect `game_start`, `round_end`, and `game_end` events.
2. **Data Extraction** – gathers pano ID, map ID, round number, and game source.
3. **API Communication** – posts the data to your backend:

   ```javascript
   POST /api/collect
   {
     "panoId": "abc123",
     "mapId": "xyz789",
     "roundNumber": 3,
     "source": "map"
   }
   ```

4. **Response Handling** – interprets backend responses (`200`, `404`, `500`).
5. **User Feedback** – shows green/blue/red notifications based on the result.

### Supported Game Modes

- Regular maps
- Daily challenges
- Community challenges
- Live challenges
- Map maker tests

### Notifications Guide

- **Success (green)** – location collected or already stored
- **Info (blue)** – no meta available for the location
- **Error (red)** – network issues, timeouts, or server errors

### Troubleshooting

- **No notifications** – ensure the script is enabled and the event framework loads; try debug mode.
- **Network errors** – verify backend is running and API URL is correct; test with “🧪 Test Collection”.
- **Rounds not detected** – refresh GeoGuessr or check for conflicting scripts.
- **Gallery empty** – check backend logs and database permissions.

### Technical Details

- Depends on the GeoGuessr Event Framework and Greasemonkey APIs (`GM_xmlhttpRequest`, `GM_getValue`, etc.).
- Runs on `*://*.geoguessr.com/*` at `document-start`.
- Stores configuration in Greasemonkey storage (`geometa_api_url`, `geometa_enabled`, etc.).
- Includes timeout protection and duplicate prevention.

### Customization

- Change API endpoints by editing the URL in the collection function.
- Extend `getGameSource()` for new game modes.
- Adjust notification styles in `createNotificationElement()`.
- Add custom debug logging with the `log()` helper.

### Updates

1. Copy the latest `userscript.js` into Tampermonkey.
2. Save and check the version via “📊 Show Status”.

**Compatibility** – requires GeoMeta Gallery v2.0+ and modern ES6 browsers.

### Support

Enable debug mode, inspect the browser console, and check backend logs when troubleshooting. Include userscript version, browser, and reproduction steps when reporting issues.

---

## GeoMeta Enhanced Gallery Userscript

### Features

- Automatic capture of LearnableMeta popups with metadata
- Beautiful carousel gallery with zoom and search
- Local storage via Tampermonkey/Violentmonkey with optional API sync
- Responsive, modern UI with keyboard navigation and dark/light themes

### Installation

**Prerequisites**

- Tampermonkey (Chrome/Edge) or Violentmonkey (Firefox/Chrome)
- Access to GeoGuessr with LearnableMeta enabled

**Steps**

1. Install a userscript manager.
2. Create a new script and paste the contents of `geometa-enhanced.user.js`.
3. Save the script and optionally update `API_BASE_URL` or other settings via the menu.

### Usage

1. Play GeoGuessr; when a LearnableMeta popup appears, the script captures it automatically.
2. Open the gallery via the floating camera button or the “Open Gallery” menu command.
3. Browse screenshots using search, filters, and the image carousel.

### Configuration

- **API integration (optional)** – set `API_BASE_URL` and configure CORS in your backend.
- **Storage settings** – `STORAGE_KEY` controls where data is saved.

### Menu Commands

- Open Gallery
- Clear All Data
- Export Data

### Extension vs Userscript

| Feature | Browser Extension | Enhanced Userscript |
|---------|------------------|---------------------|
| Installation | Chrome Web Store | Userscript manager |
| Updates | Automatic | Manual / @updateURL |
| Permissions | Extensive | Minimal |
| Storage | Extension storage | GM storage |
| UI Integration | Popup/Options page | In-page gallery |
| Cross-browser | Limited | Universal |
| Customization | Limited | Full code access |
| Offline capable | Yes | Yes |
| API sync | Required | Optional |

### Customization

- Modify CSS via `GM_addStyle` to change gallery appearance.
- Tweak functions like `captureMeta`, `createCarousel`, `renderGallery`, or `uploadToAPI` to adjust behavior.

### Troubleshooting

- **Screenshots not capturing** – ensure popup selector `.geometa-container` matches and check console errors.
- **Gallery not opening** – verify the script is enabled and reload the page.
- **API sync failing** – confirm server status, API URL, and CORS configuration.
- **Images not loading** – check for 404s or clear browser cache.
- Enable debug mode with:

  ```javascript
  localStorage.setItem('geometa-debug', 'true');
  ```

### Migration from Extension

1. Export existing data from your Next.js app.
2. Install the userscript.
3. Import data via the gallery interface (planned feature).
4. Disable the old extension to avoid conflicts.

### Future Enhancements

- Planned: cloud sync, advanced filtering, bulk operations, statistics dashboard improvements, keyboard shortcuts, full‑screen mode, image comparison.
- Community requests: auto‑categorization, learning mode, sharing, integration with other GeoGuessr tools.

### Technical Details

- Uses `html2canvas` and Greasemonkey APIs for screenshot capture and storage.
- Stores data as JSON objects with base64‑encoded images.
- Optimized for ~5 MB local storage and fast DOM operations.

### Contributing

Fork, modify, and share improvements. Report issues or create themes and UI variations.

### License & Acknowledgments

MIT License. Thanks to the LearnableMeta team, the GeoGuessr community, and Tampermonkey/Violentmonkey developers.

---

**Happy collecting and meta learning!** 🌍📸

