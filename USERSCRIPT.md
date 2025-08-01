# GeoMeta Collector Userscript Documentation

## 📝 Overview

The **GeoMeta Collector** userscript is the heart of GeoMeta Gallery v2.0. It automatically collects location data while you play GeoGuessr and sends it to your local backend for processing and storage.

**Key Features:**
- 🔄 **Automatic detection** of round endings in GeoGuessr
- 📡 **Direct integration** with your local GeoMeta Gallery backend
- 🔔 **Smart notifications** showing collection status
- ⚙️ **Configurable settings** via Tampermonkey menu
- 🎮 **Support for all game modes** (regular, challenges, live challenges)
- 🐛 **Debug mode** for troubleshooting

## 🚀 Installation

### Prerequisites
- **Tampermonkey** (Chrome) or **Violentmonkey** (Firefox) browser extension
- **GeoMeta Gallery backend** running locally (usually http://localhost:3000)

### Step-by-Step Installation

1. **Install Tampermonkey**
   - Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: Install Violentmonkey instead

2. **Create New Userscript**
   - Click Tampermonkey extension icon
   - Select "Dashboard"
   - Click "Create a new script"
   - Delete the template content

3. **Install GeoMeta Collector**
   - Copy the entire contents of `userscript.js` from the project
   - Paste into the Tampermonkey editor
   - Save the script (Ctrl+S or Cmd+S)

4. **Verify Installation**
   - The script should appear as "GeoMeta Collector" in your dashboard
   - Status should show as "Enabled"
   - Navigate to any webpage and check if Tampermonkey menu shows GeoMeta Collector options

## ⚙️ Configuration

Access all settings via **Tampermonkey menu** → **GeoMeta Collector**:

### 🌐 Configure API URL
**Default:** `http://localhost:3000`

Set the URL where your GeoMeta Gallery backend is running.

```
Examples:
- http://localhost:3000 (default)
- http://localhost:8080 (custom port)
- http://192.168.1.100:3000 (different machine on network)
```

### 🔄 Toggle Collection
**Default:** Enabled

Enable or disable automatic collection while playing GeoGuessr.
- ✅ **Enabled**: Automatically collect location data when rounds end
- ❌ **Disabled**: No collection, useful for casual play

### 🔔 Toggle Notifications
**Default:** Enabled

Control whether success/info notifications appear in GeoGuessr.
- ✅ **Enabled**: Show all notifications
- ❌ **Disabled**: Only show error notifications

**Note:** Error notifications are always shown for troubleshooting.

### 🐛 Toggle Debug Mode
**Default:** Disabled

Enable detailed logging to browser console for troubleshooting.
- ✅ **Enabled**: Verbose logging of all actions
- ❌ **Disabled**: Minimal logging

### 🧪 Test Collection
Manually trigger a test collection to verify your setup is working.

**What it does:**
- Sends a test location to your backend
- Shows the same notifications as real gameplay
- Helps verify API connectivity and configuration

**Expected result:** You should see either:
- ✅ "Collected: test location" (if backend is working)
- ❌ "Network error" (if backend is unreachable)

### 📊 Show Status
Display current configuration and connection status.

**Information shown:**
- Script version
- API URL
- All toggle states
- Framework connection status
- Current processing state

## 🎮 How It Works

### 1. Event Detection
The userscript uses the **GeoGuessr Event Framework** to detect game events:
- `game_start`: Reset processing state
- `round_end`: Extract location data and collect
- `game_end`: Clean up state

### 2. Data Extraction
When a round ends, the script extracts:
- **Pano ID**: Google Street View panorama identifier
- **Map ID**: GeoGuessr map identifier  
- **Round Number**: Current round (1-5)
- **Source**: Game mode (map, challenge, liveChallenge, etc.)

### 3. API Communication
Data is sent to your backend via HTTP POST:
```javascript
POST /api/collect
Content-Type: application/json

{
  "panoId": "abc123...",
  "mapId": "xyz789...", 
  "roundNumber": 3,
  "source": "map"
}
```

### 4. Response Handling
The backend responds with:
- **200 OK**: Location collected successfully
- **404 Not Found**: No meta available for this location
- **500 Error**: Server error or API issue

### 5. User Feedback
Notifications are shown based on the response:
- ✅ **Green**: Successfully collected location
- ℹ️ **Blue**: Location found but no meta available
- ❌ **Red**: Error occurred (network, server, etc.)

## 🎯 Supported Game Modes

### ✅ Regular Maps
Standard GeoGuessr games on any map.
- **Detection**: Map ID from game data
- **Source**: `"map"`

### ✅ Daily Challenges  
Official GeoGuessr daily challenges.
- **Detection**: Challenge URL pattern
- **Source**: `"challenge"`

### ✅ Community Challenges
User-created challenge games.
- **Detection**: Challenge URL pattern  
- **Source**: `"challenge"`

### ✅ Live Challenges
Real-time multiplayer challenges.
- **Detection**: Live challenge URL pattern
- **Source**: `"liveChallenge"`

### ✅ Map Maker
When testing maps in the map maker.
- **Detection**: Map maker URL pattern
- **Source**: `"mapMaker"`

## 🔔 Notifications Guide

### Success Notifications (Green ✅)

**"✅ Collected: [Country] ([Meta Name])"**
- Location successfully collected and stored
- Meta information was available
- New entry added to your gallery

**"ℹ️ Already collected: [Country]"**  
- Location already exists in your database
- No duplicate entry created
- This is normal behavior

### Info Notifications (Blue ℹ️)

**"ℹ️ No meta available for this location"**
- Location exists but has no meta information in LearnableMeta database
- This is normal - not all locations have meta
- No entry is created in your gallery

### Error Notifications (Red ❌)

**"❌ Network error - check if your gallery is running"**
- Cannot connect to your backend API
- Verify backend is running at configured URL
- Check firewall/network settings

**"⏱️ Request timeout - your gallery may be slow"**
- Request took longer than 15 seconds
- Backend may be overloaded or slow
- Try again or restart backend

**"❌ Collection failed: [Error Message]"**
- Backend returned an error
- Check backend logs for details
- May indicate API or database issues

## 🐛 Troubleshooting

### No Notifications Appearing

**Possible causes:**
- Userscript is disabled in Tampermonkey
- GeoGuessr Event Framework failed to load
- Script errors preventing execution

**Solutions:**
1. Check Tampermonkey dashboard - ensure script is enabled
2. Enable debug mode and check browser console for errors
3. Try reloading the GeoGuessr page
4. Verify script installation by checking Tampermonkey menu

### Network Error Notifications

**Possible causes:**
- Backend not running
- Wrong API URL configured
- Firewall blocking localhost connections
- Port conflicts

**Solutions:**
1. Verify backend is running: `npm run dev` in terminal
2. Check API URL: Tampermonkey menu → "⚙️ Configure API URL"
3. Test connection: Use "🧪 Test Collection" feature
4. Try different port if 3000 is blocked

### Script Not Detecting Rounds

**Possible causes:**
- GeoGuessr Event Framework not loading
- GeoGuessr website changes
- Browser compatibility issues

**Solutions:**
1. Enable debug mode and check console for framework errors
2. Try refreshing GeoGuessr page
3. Check if other GeoGuessr userscripts are interfering
4. Update to latest version of the script

### Collection Working But Gallery Empty

**Possible causes:**
- Backend receiving data but database not saving
- API endpoint errors
- Database permissions issues

**Solutions:**
1. Check backend terminal for error messages
2. Verify database file exists and is writable
3. Try restarting backend: `npm run dev`
4. Check browser network tab for API responses

## 🔧 Technical Details

### Dependencies
- **GeoGuessr Event Framework**: For detecting game events
- **GM_xmlhttpRequest**: For making API calls
- **GM_getValue/GM_setValue**: For storing configuration
- **GM_registerMenuCommand**: For menu options

### Userscript Headers
```javascript
// @match        *://*.geoguessr.com/*
// @require      https://raw.githubusercontent.com/miraclewhips/geoguessr-event-framework/...
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
```

### Configuration Storage
Settings are stored using Greasemonkey storage:
- `geometa_api_url`: Backend API URL
- `geometa_enabled`: Collection enabled/disabled
- `geometa_notifications`: Notifications enabled/disabled  
- `geometa_debug`: Debug mode enabled/disabled

### Error Handling
The script includes comprehensive error handling:
- Network timeouts (15 seconds)
- JSON parsing errors
- API response validation
- Framework initialization failures

### Performance Considerations
- **Non-blocking**: All API calls are asynchronous
- **Duplicate prevention**: Checks if already processing
- **Timeout protection**: Prevents hanging requests
- **Memory efficient**: Minimal state storage

## 🛠️ Customization

### Changing API Endpoints
To use different backend endpoints, modify the collection function:

```javascript
const url = `${CONFIG.apiUrl}/api/collect`;
```

### Adding Custom Game Sources
To support additional game modes, extend the `getGameSource()` function:

```javascript
function getGameSource() {
    const url = window.location.href;
    if (url.includes('/custom-mode/')) return 'customMode';
    // ... existing code
}
```

### Custom Notification Styles
Notification appearance can be customized in `createNotificationElement()`:

```javascript
const colors = {
    success: { bg: '#10b981', border: '#059669' },
    // Add custom colors here
};
```

### Debug Logging
Add custom debug information:

```javascript
function log(...args) {
    if (CONFIG.debugMode) {
        console.log('[GeoMeta Collector]', ...args);
    }
}
```

## 🔄 Updates

### Updating the Script
1. Copy new version from `userscript.js`
2. Paste into Tampermonkey editor (replacing old version)
3. Save the script
4. Check version in "📊 Show Status"

### Version Compatibility
- **v2.0.0+**: Current version with all features
- **Backend compatibility**: Requires GeoMeta Gallery v2.0+
- **Browser support**: Modern browsers with ES6+ support

## 📞 Support

### Getting Help
1. **Enable debug mode** for detailed error information
2. **Check browser console** for error messages
3. **Use test collection** to verify basic functionality
4. **Check backend logs** for server-side issues

### Common Solutions
- **Clear browser cache** if behavior is inconsistent
- **Restart browser** to reload userscript engine
- **Update Tampermonkey** to latest version
- **Disable conflicting scripts** temporarily

### Reporting Issues
When reporting problems, include:
- Userscript version (from "📊 Show Status")
- Browser and Tampermonkey version
- Error messages from console (if any)
- Steps to reproduce the issue
- Backend logs (if relevant)

---

**Happy collecting!** The userscript should work seamlessly in the background while you enjoy playing GeoGuessr. 🌍✨