# GeoMeta Gallery

**A personal tool for collecting and studying GeoGuessr meta information with spaced repetition learning.**

GeoMeta Gallery helps you become better at GeoGuessr by automatically collecting location metadata as you play and providing a powerful study system with spaced repetition algorithms.

## 🏗️ How It Works

```
GeoGuessr → Userscript → Backend API → LearnableMeta API → SQLite Database → Study Interface
```

**Simple workflow:**
1. Play GeoGuessr with the userscript installed
2. Location data is automatically collected at round end
3. Rich meta information is fetched from LearnableMeta API
4. Data is stored as lightweight JSON in SQLite database
5. Study collected locations using spaced repetition in a beautiful interface

## ✨ Features

### 🔄 Automatic Collection
- **Set-and-forget** data collection while playing GeoGuessr
- **Smart notifications** show collection status in-game
- **Duplicate detection** prevents storing the same location twice
- **Multiple game modes** supported (regular, challenges, live challenges)

### 🧠 Spaced Repetition Learning
- **Built-in study mode** using simplified SM-2 algorithm
- **Smart scheduling**: "Again" (1 week), "Hard" (half interval), "Good" (1→6→15 days), "Easy" (1.3× bonus)
- **Progress tracking** with daily review counts and success rates
- **Study dashboard** showing due cards and learning statistics

### 🎨 Beautiful Interface
- **Card-based design** with country flags and preview images  
- **Rich content display** with HTML notes and reference images
- **Detailed modal view** for studying individual locations
- **Image carousels** for locations with multiple photos
- **Fully responsive** design for desktop and mobile

### 🔍 Powerful Search & Filtering
- **Full-text search** across countries, meta names, and notes
- **Advanced filtering** by country, continent, and other metadata
- **Real-time results** as you type
- **Shareable URLs** for bookmarking searches and filters

### 🛠️ Easy Management
- **One-click deletion** of unwanted locations
- **Automatic organization** by collection date
- **Technical metadata** for debugging and reference
- **JSON-based storage** for easy data export

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed on your system
- **Tampermonkey** (Chrome) or **Violentmonkey** (Firefox) browser extension

### 1. Setup Backend
```bash
# Clone the repository
git clone https://github.com/lolwierd/geometa.git
cd geometa/app

# Install dependencies
npm install

# Initialize the database
npm run db:init

# Start the development server
npm run dev
```

Your gallery will be available at **http://localhost:3000**

### 2. Install Userscript
1. **Open Tampermonkey** dashboard in your browser
2. **Click "Create a new script"**
3. **Delete the template** and paste the contents of `userscript.js`
4. **Save the script** (Ctrl+S)
5. **Configure API URL** via Tampermonkey menu (default: http://localhost:3000)

See [USERSCRIPT.md](USERSCRIPT.md) for detailed installation instructions and advanced options.

### 3. Start Collecting
- **Play GeoGuessr** as normal
- **Watch for notifications** showing successful collection
- **Check your gallery** to see new locations appear as beautiful cards
- **Use the memorizer** at `/memorizer` to study collected locations with spaced repetition

## 🎮 Supported Game Modes

- ✅ **Regular Maps** - Standard GeoGuessr games
- ✅ **Daily Challenges** - Official daily challenges  
- ✅ **Community Challenges** - User-created challenges
- ✅ **Live Challenges** - Real-time multiplayer
- ✅ **Map Testing** - When playing in map maker

## 🏗️ Tech Stack

### Backend
- **Next.js 15** with API routes and React 19
- **SQLite** with better-sqlite3 for fast local storage
- **Full-text search** using SQLite FTS5

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** + Radix UI primitives for beautiful components
- **Framer Motion** for smooth animations
- **Lucide React** for consistent icons

### Data Collection
- **Browser userscripts** for automatic GeoGuessr integration
- **LearnableMeta API** for rich geographical metadata
- **JSON-based storage** for efficient data management

## ⚙️ Configuration

Access userscript settings via **Tampermonkey menu** → **GeoMeta Collector**:

- **🔧 API URL**: Set your backend URL (default: `http://localhost:3000`)
- **🔄 Toggle Collection**: Enable/disable automatic data collection
- **🔔 Toggle Notifications**: Show/hide success notifications in GeoGuessr
- **🐛 Debug Mode**: Enable detailed logging for troubleshooting
- **🧪 Test Collection**: Verify your setup is working correctly
- **📊 Connection Status**: Display current configuration and connectivity

## 🌐 API Endpoints

The backend provides a simple REST API:

- **`GET /api/gallery`** - Retrieve locations with filtering and search
  - Query params: `country`, `continent`, `q` (search), `limit`, `offset`
- **`POST /api/collect`** - Collect new location data (called by userscript)
  - Body: `{ panoId, mapId, roundNumber, source }`
- **`DELETE /api/gallery?id=X`** - Delete specific location
- **`GET /api/memorizer`** - Get next card for spaced repetition study
- **`POST /api/memorizer/[id]`** - Update review progress for a card
- **`GET /api/stats`** - Get learning statistics and progress data

## 🎨 Gallery Features

### 🖼️ Card Interface
- **Elegant card design** showing country flags, meta names, and preview images
- **Hover interactions** reveal action buttons (view details, delete)
- **Click anywhere** to open detailed study modal
- **Visual indicators** for image count and collection timestamps
- **Responsive grid layout** (1-5 columns based on screen size)

### 🔍 Advanced Search
- **Full-text search** across all location content
- **Smart filtering** by country, continent, and metadata
- **Real-time results** with search term highlighting  
- **Shareable URLs** for bookmarked searches
- **Live updates** every 3 seconds and on tab focus

### 🧠 Study Mode
- **Spaced repetition interface** for effective learning
- **Detailed location modals** with all collected metadata
- **Image carousels** for locations with multiple reference photos
- **Progress tracking** and learning statistics
- **Keyboard shortcuts** for efficient studying

## 🐛 Troubleshooting

### Backend Issues
**Backend won't start:**
```bash
rm -rf node_modules package-lock.json
npm install && npm run dev
```

**Database errors:**
```bash
npm run db:init  # Reinitialize database
```

### Userscript Issues
**No collection notifications:**
- Verify Tampermonkey script is enabled
- Check API URL in Tampermonkey menu settings
- Enable debug mode and check browser console

**"Network error" notifications:**  
- Ensure backend is running at http://localhost:3000
- Test collection feature in Tampermonkey menu
- Check firewall or antivirus blocking localhost connections

### Gallery Issues
**Empty gallery:**
- Play GeoGuessr rounds to collect data first
- Verify userscript notifications are appearing
- Check that database was initialized: `npm run db:init`

**"No meta available" messages:**
This is normal - not all GeoGuessr locations have metadata in the LearnableMeta database.

## 🚀 Future Enhancements

### Planned Features
- **🎯 Advanced Study Modes**: Customizable spaced repetition intervals and difficulty algorithms
- **📊 Enhanced Analytics**: Detailed learning progress visualization and success rate tracking
- **🗺️ Map Integration**: Interactive maps showing collected locations and learning progress
- **📱 Mobile App**: Native mobile companion for on-the-go studying
- **☁️ Cloud Sync**: Optional cloud backup and sync across devices
- **👥 Community Features**: Share collections and compete with other learners

### Potential Integrations
- **📚 Anki Export**: Direct export to Anki flashcard format
- **🎮 Additional Game Support**: Seterra, World Geography Games integration
- **🌐 Wikipedia Integration**: Rich contextual information for studied locations
- **🎨 Custom Themes**: Personalized UI themes and card designs
- **🔊 Audio Pronunciation**: Country and city name pronunciation guides
- **🏆 Achievement System**: Gamified learning milestones and badges

### Technical Improvements
- **⚡ Performance**: Lazy loading, virtual scrolling for large collections
- **🔄 Real-time Sync**: WebSocket-based real-time updates across browser tabs
- **🗄️ Advanced Database**: PostgreSQL option for advanced querying capabilities
- **🔌 Plugin Architecture**: Custom userscript and UI extensions
- **📤 Data Portability**: Import/export in multiple formats (JSON, CSV, KML)
- **🛡️ Enhanced Security**: Optional authentication and encrypted storage

## 🤝 Contributing

This project welcomes contributions! Whether you're interested in:
- 🐛 Bug fixes and improvements
- ✨ New feature development  
- 📚 Documentation enhancements
- 🧪 Testing and quality assurance
- 🎨 UI/UX improvements

Feel free to fork the repository and submit pull requests. The codebase is designed to be approachable and well-documented for developers of all skill levels.

## 📄 License

**MIT License** - Feel free to use, modify, and distribute for personal or educational purposes.

---

**Start your geography learning journey today!** 🌍✨

GeoMeta Gallery makes studying GeoGuessr locations engaging and scientifically effective.