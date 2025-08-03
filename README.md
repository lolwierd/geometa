# GeoMeta Gallery v2.0

**A dramatically simplified personal tool for collecting and studying GeoGuessr meta information.**

Gone are the days of complex browser extensions, screenshot processing, and image storage overhead. Version 2.0 is a complete rewrite that focuses on what matters: **clean data collection and beautiful presentation**.

## 🎯 What's New in v2.0

### ❌ What We Removed
- Complex browser extension with screenshot capture
- Image processing and storage overhead  
- CORS workarounds and background scripts
- Virtual scrolling and performance bottlenecks
- Database bloat from storing binary images

### ✅ What We Added
- **Simple userscript** for effortless data collection
- **Direct API integration** with LearnableMeta
- **Beautiful card-based UI** with native React components
- **Full-text search** across all metadata content
- **90% smaller database** using JSON instead of images
- **Much faster performance** with no image processing
- **Responsive design** that works on all screen sizes

## 🏗️ Architecture

```
OLD v1.0: Userscript → Browser Extension → Screenshots → Image Processing → Gallery
NEW v2.0: Userscript → Backend API → LearnableMeta API → JSON Storage → Card UI
```

**Simple and efficient:**
1. Play GeoGuessr with userscript installed
2. On round end, userscript sends location data to your backend
3. Backend fetches rich meta information from LearnableMeta API
4. Data stored as lightweight JSON in SQLite database
5. Frontend renders beautiful, searchable cards with all the meta content

## ✨ Features

### 🔄 Automatic Collection
- **Set-and-forget** data collection while playing GeoGuessr
- **Smart notifications** show collection status in-game
- **Duplicate detection** prevents storing the same location twice
- **Multiple game modes** supported (regular, challenges, live challenges)

### 🎨 Beautiful UI
- **Card-based design** with country flags and preview images
- **Rich content display** with HTML notes (sanitized via DOMPurify) and reference images
- **Detailed modal view** for studying individual locations
- **Image carousel** for locations with multiple reference photos
- **Responsive layout** that adapts to any screen size

### 🔍 Powerful Search & Filtering
- **Full-text search** across countries, meta names, and notes
- **Country filtering** to focus on specific regions
- **Real-time results** as you type
- **Advanced search** through HTML content, not just text

### 🛠️ Easy Management
- **One-click deletion** of unwanted locations
- **Automatic organization** by collection date
- **Technical metadata** for debugging and reference
- **Export capabilities** built into the data structure

### 🧠 Spaced Repetition Memorizer
- Built-in study mode using a simplified SM-2 algorithm
- "Hard" answers mark the card as lapsed, show it again within minutes, and count toward lapsed stats
- "Good" answers progress intervals like 1 → 6 → 15 days
- "Easy" answers add a 30% bonus after the second review for 1 → 6 → 20 days

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 18+** installed on your system
- **Tampermonkey** (Chrome) or **Violentmonkey** (Firefox) browser extension

### 2. Setup Backend
```bash
# Clone or download the project
cd geometa-gemini/app

# Install dependencies
npm install

# Initialize the database
npm run db:init

# Start the development server
npm run dev
```

Your gallery will be available at **http://localhost:3000**

### 3. Install Userscript
1. **Open Tampermonkey** dashboard in your browser
2. **Click "Create a new script"**
3. **Delete the template** and paste the contents of `userscript.js`
4. **Save the script** (Ctrl+S)
5. **Configure API URL** via Tampermonkey menu (default: http://localhost:3000)

### 4. Start Collecting
- **Play GeoGuessr** as normal
- **Watch for notifications** showing successful collection
- **Check your gallery** to see new locations appear as beautiful cards

## 🎮 Supported Game Modes

- ✅ **Regular Maps** - Standard GeoGuessr games
- ✅ **Daily Challenges** - Official daily challenges  
- ✅ **Community Challenges** - User-created challenges
- ✅ **Live Challenges** - Real-time multiplayer
- ✅ **Map Testing** - When playing in map maker

## 📊 Database Schema

The new lightweight schema stores everything as JSON:

```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pano_id TEXT NOT NULL UNIQUE,        -- Google Street View panorama ID
  map_id TEXT NOT NULL,                -- GeoGuessr map identifier
  country TEXT NOT NULL,               -- Country name with flag support
  country_code TEXT,                   -- ISO country code for flags
  meta_name TEXT,                      -- Specific meta category
  note TEXT,                           -- Rich HTML content with learning tips
  footer TEXT,                         -- Additional information
  images TEXT DEFAULT '[]',            -- JSON array of image URLs
  raw_data TEXT DEFAULT '{}',          -- Full API response for future use
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Full-text search** is built-in with SQLite FTS5 for instant searching across all content.

## 🔧 Configuration

Access settings via **Tampermonkey menu** → **GeoMeta Collector**:

### ⚙️ Configure API URL
Set your backend URL (default: `http://localhost:3000`)

### 🔄 Toggle Collection  
Enable/disable automatic collection while playing

### 🔔 Toggle Notifications
Show/hide success notifications in GeoGuessr

### 🐛 Toggle Debug Mode
Enable detailed logging for troubleshooting

### 🧪 Test Collection
Verify your setup is working correctly

### 📊 Show Status
Display current configuration and connection status

## 🌐 API Endpoints

The backend provides a simple REST API:

- **`GET /api/gallery`** - Retrieve locations with filtering and search
  - Query params: `country`, `q` (search), `limit`, `offset`
- **`POST /api/collect`** - Collect new location (called by userscript)
  - Body: `{ panoId, mapId, roundNumber, source }`
- **`DELETE /api/gallery?id=X`** - Delete specific location
- **`GET /api/img?u=<URL>`** - Proxies & caches remote images from *learnablemeta.com* only (returns `Cache-Control: max-age=31536000, immutable`; `x-proxy-cache: hit|miss`)

## 🎨 Gallery Features

### 🖼️ Card View
- **Compact cards** showing country, flag, meta name, and preview
- **Hover effects** reveal action buttons (view/delete)
- **Click anywhere** to open detailed modal
- **Visual indicators** for image count and collection date

### 🍂 Detail Modal
- **Full-screen view** with all location information
- **Image carousel** for multiple reference photos
- **Rich HTML rendering** of notes and footer content
- **Technical metadata** for debugging
- **Keyboard navigation** for power users

### 🔍 Search & Filter
- **Instant search** across all text content
- **Country dropdown** with location counts
- **Real-time results** with no page refreshes
- **Search highlighting** in results

### 📱 Responsive Design
- **Mobile-friendly** interface
- **Adaptive grid** (1-5 columns based on screen size)
- **Touch-optimized** interactions
- **Fast loading** even with hundreds of locations

## 🐛 Troubleshooting

### Backend Issues

**Backend won't start:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Database errors:**
```bash
npm run db:init  # Recreate database
```

### Userscript Issues

**No notifications in GeoGuessr:**
- Check Tampermonkey dashboard - ensure script is enabled
- Verify API URL in Tampermonkey menu
- Enable debug mode and check browser console

**"Network error" notifications:**
- Ensure backend is running at http://localhost:3000
- Check firewall settings
- Try the test collection feature

### Gallery Issues

**Empty gallery:**
- Play some GeoGuessr rounds to collect data
- Check that userscript is working (notifications appear)
- Verify database has data: check backend logs

**"No meta available" messages:**
This is normal! Not all GeoGuessr locations have meta information in the LearnableMeta database. Only certain popular maps are supported.

## 🔄 Migration from v1.0

If you're upgrading from the old screenshot-based system:

1. **Backup your data** (optional - screenshots won't be migrated)
2. **Run the migration**: `npm run db:init`
3. **Remove old browser extension**
4. **Install new userscript**
5. **Start collecting fresh data**

See `MIGRATION.md` for detailed step-by-step instructions.

## 🏗️ Development

### Tech Stack
- **Backend:** Next.js 15 with API routes
- **Database:** SQLite with better-sqlite3
- **Frontend:** React 19 with TypeScript
- **UI:** Tailwind CSS + Radix UI primitives
- **Search:** SQLite FTS5 full-text search
- **Icons:** Lucide React

### Project Structure
```
app/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main gallery page
│   ├── components/       # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── MetaCard.jsx  # Location card component
│   └── lib/              # Utilities and database connection
├── db/                   # Database schema and initialization
└── package.json          # Dependencies and scripts
```

### Running in Development
```bash
cd app
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:init      # Initialize database
```

## 📈 Performance

Compared to v1.0:
- **90% smaller database** (JSON vs binary images)
- **10x faster loading** (no image processing)
- **Instant search** (SQLite FTS5)
- **Better UX** (native React components)
- **Easier maintenance** (simpler codebase)

## 🤝 Contributing

This is a personal learning tool, but you're welcome to fork and customize it for your own use. The new architecture is much simpler to understand and modify.

## 📄 License

MIT License - Use this however you'd like for personal/educational purposes.

## 🎯 What's Next

Future improvements might include:
- Spaced repetition system for studying
- Export to Anki flashcards
- Statistics and learning progress
- Collaborative features for sharing collections
- Integration with other geography learning tools

---

**Happy collecting!** 🌍✨

The new GeoMeta Gallery makes learning geography from GeoGuessr effortless and enjoyable.