# Migration Guide: GeoMeta Gallery v1.0 → v2.0

## 🎯 What's Changing

**v1.0 (Old):** Browser extension → Screenshots → Image processing → Gallery
**v2.0 (New):** Userscript → JSON data → Native React cards → Gallery

### Key Improvements
- ✅ **90% smaller database** (JSON vs images)
- ✅ **Much faster performance** (no image processing)
- ✅ **Better UI** (native React components vs static screenshots)
- ✅ **Full-text search** (searchable HTML content)
- ✅ **Simpler maintenance** (no browser extension complexity)

## 🚨 Before You Start

### Prerequisites
- Node.js 18+ installed
- Tampermonkey or Violentmonkey browser extension
- Your current GeoMeta Gallery running

### Important Notes
- **Your old screenshot data will be lost** (this is intentional - fresh start!)
- **The browser extension will be removed** (replaced by simple userscript)
- **Database schema completely changes** (screenshots → locations)
- **Take 10-15 minutes** for complete migration

## 📋 Migration Steps

### Step 1: Backup Current Data (Optional)

If you want to keep your old screenshots for reference:

```bash
cd app
# Create backup of current database
cp db/geometa.db db/geometa-v1-backup.db

# Create backup of uploaded images (if you want them)
cp -r public/uploads public/uploads-v1-backup
```

### Step 2: Stop Current System

```bash
# Stop your current backend if running
# Press Ctrl+C in the terminal running npm run dev

# Disable your current browser extension
# Go to chrome://extensions and disable "GeoMeta Collector"
```

### Step 3: Pull Latest Code

```bash
# Make sure you have the latest code with v2.0 changes
git pull origin main  # or however you get updates

# Install any new dependencies
cd app
npm install
```

### Step 4: Migrate Database Schema

```bash
# This will create the new v2.0 database structure
npm run db:init
```

You should see output like:
```
🔄 Migrating to GeoMeta Gallery v2.0 schema...
✅ Removed old screenshots table
✅ Created locations table with indexes
✅ Created full-text search capabilities
🎉 GeoMeta Gallery v2.0 database schema initialized successfully!
```

### Step 5: Remove Old Browser Extension

1. Open your browser extensions page (`chrome://extensions`)
2. Find "GeoMeta Collector" or similar
3. Click **Remove** (not just disable)
4. Delete the old `extension/` folder if it exists

### Step 6: Install New Userscript

1. **Install Tampermonkey** (if not already installed)
   - Chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
   - Firefox: Install Violentmonkey instead

2. **Create New Userscript**
   - Open Tampermonkey dashboard
   - Click "Create a new script"
   - Delete the template content
   - Copy the entire contents of `userscript.js`
   - Paste into Tampermonkey editor
   - Save (Ctrl+S)

3. **Configure Userscript**
   - The script should show as enabled
   - Go to any webpage and check Tampermonkey menu
   - You should see "GeoMeta Collector" options

### Step 7: Test New System

```bash
# Start the new backend
cd app
npm run dev
```

1. **Test Backend**
   - Open http://localhost:3000
   - Should see new card-based gallery UI
   - Should show "No locations collected yet" message

2. **Test Userscript**
   - Click Tampermonkey icon → GeoMeta Collector → "🧪 Test Collection"
   - Should see notification: "🧪 Testing collection..."
   - Check gallery - should show test location if API is working

3. **Test GeoGuessr Integration**
   - Go to GeoGuessr.com
   - Start any game
   - Complete a round
   - Should see notification: "✅ Collected: [Country]" or "ℹ️ No meta available"

### Step 8: Configure Settings

Access via Tampermonkey menu → GeoMeta Collector:

- **⚙️ Configure API URL**: Set to `http://localhost:3000` (default)
- **🔄 Toggle Collection**: Enable/disable automatic collection  
- **🔔 Toggle Notifications**: Show/hide in-game notifications
- **🐛 Toggle Debug Mode**: Enable for troubleshooting

## ✅ Success Checklist

After migration, verify these work:

- [ ] Backend starts without errors (`npm run dev`)
- [ ] Gallery loads at http://localhost:3000 with new UI
- [ ] Userscript shows in Tampermonkey as enabled
- [ ] Test collection works (via Tampermonkey menu)
- [ ] GeoGuessr shows collection notifications
- [ ] New locations appear as cards in gallery
- [ ] Search and filtering work
- [ ] Location details modal opens
- [ ] Delete functionality works

## 🐛 Common Issues

### Backend Won't Start

**Error:** "Module not found" or similar
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error:** "Database locked" or "SQLITE_BUSY"
```bash
# Solution: Close any open database connections
pkill -f "node"
npm run dev
```

### Userscript Not Working

**Issue:** No notifications in GeoGuessr
- Check Tampermonkey dashboard - ensure script is enabled
- Check API URL: Tampermonkey menu → "⚙️ Configure API URL"
- Enable debug mode and check browser console for errors

**Issue:** "Network error" notifications
- Verify backend is running (`npm run dev`)
- Check if localhost:3000 is accessible
- Try test collection from Tampermonkey menu

### Gallery Shows Errors

**Issue:** "Failed to fetch locations"
- Check if backend is running
- Verify database was migrated successfully
- Check browser console for detailed errors

### No Meta Available for Certain Locations

**This is normal!** Not all GeoGuessr locations have meta in the LearnableMeta database. The userscript will show:
- ✅ Green: Successfully collected meta
- ℹ️ Blue: Location exists but no meta available  
- ❌ Red: Error (check your setup)

## 🎉 You're Done!

Your new simplified system should now be running with:

- **Automatic collection** when playing GeoGuessr
- **Beautiful card-based UI** instead of static screenshots
- **Fast full-text search** across all your collected meta
- **Much better performance** and smaller database
- **Easier maintenance** with simpler codebase

## 🔄 Going Back (Emergency)

If something goes wrong and you need to revert:

```bash
# Restore old database (if backed up)
cd app
cp db/geometa-v1-backup.db db/geometa.db

# Restore old images (if backed up)  
cp -r public/uploads-v1-backup public/uploads

# Re-enable old browser extension
# Install from extension/ folder or backup
```

## 📞 Need Help?

If you encounter issues:

1. **Check the logs**: Browser console and terminal output
2. **Enable debug mode**: Tampermonkey menu → "🐛 Toggle Debug Mode"
3. **Test step by step**: Use the test collection feature
4. **Start fresh**: Delete database and re-run migration

The new system is much simpler and more reliable than the old one!