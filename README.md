# GeoMeta Gallery

GeoMeta Gallery is a specialized, self-hosted web application designed to automate the capture and review of "meta" clues from the online geography game GeoGuessr. It serves as a personal learning tool to help players systematically memorize geographic details and improve their gameplay.

The system consists of a browser extension that automatically screenshots in-game meta information and a web-based gallery to view, filter, and study the captured clues.

## 🎯 Features

### Backend (Next.js API)
- **Automated Storage:** A single API endpoint (`/api/upload`) receives screenshot images and rich metadata from the browser extension
- **Local First:** All data is stored locally. Images are saved to the `/public/uploads` directory, and metadata is stored in a lightweight **SQLite** database
- **Gallery API:** A second endpoint (`/api/gallery`) serves the captured data to the frontend, with support for filtering by country and full-text search across all metadata
- **Delete API:** A delete endpoint (`/api/delete`) allows removal of screenshots from both database and filesystem

### Frontend (Next.js + React + shadcn/ui)
- **Modern Gallery:** A responsive, clean gallery displays all captured screenshots in a dense grid for easy browsing
- **Powerful Filtering:** Instantly filter the gallery by country or search for specific clues, road markings, vegetation, or any other captured metadata
- **Detail View & Quiz Mode:** Click on any screenshot to view it in high resolution and see its associated metadata. An optional "Quiz Mode" hides the details, allowing you to test your recall
- **Delete Functionality:** Remove unwanted screenshots directly from the gallery interface
- **Download Feature:** Save individual screenshots to your local machine
- **Responsive Design:** The interface is optimized for both desktop and mobile browsing

### Browser Extension (Chromium)
- **Fully Automated Capture:** The extension runs on GeoGuessr pages and automatically detects when a round is finished and the "Learnable Meta" popup is displayed
- **Rich Metadata Extraction:** It intelligently scrapes all relevant information from the popup, including the country, flag, descriptive notes, and all associated meta images
- **High-Fidelity Screenshots:** It screenshots *only* the meta popup `div`, ensuring a clean and focused image
- **Flag Sizing Fix:** Properly handles SVG-to-PNG conversion for country flags, ensuring correct sizing in screenshots
- **Robust Navigation Handling:** The extension gracefully handles rapid navigation between rounds, canceling obsolete capture attempts
- **Cross-Origin Image Handling:** Uses background script to fetch images and bypass CORS restrictions

## 🛠️ Recent Improvements

### Extension Fixes
- **Fixed Flag Sizing Issue:** Resolved problem where country flags appeared zoomed-in or distorted in screenshots
- **Improved Cancellation System:** Better handling of navigation during image processing
- **Enhanced Image Fetching:** Proper resizing of flag images from SVG to PNG format
- **Robust Error Handling:** Extension continues working even if individual captures fail

### Gallery Enhancements
- **Modern UI with shadcn/ui:** Clean, accessible interface components
- **Improved Performance:** Removed virtual scrolling complexity, uses simple CSS Grid
- **Better Modal Experience:** Full-featured dialog with proper state management
- **Delete Functionality:** Remove screenshots with confirmation dialog
- **Download Feature:** Save screenshots locally with proper filenames
- **Responsive Layout:** Works well on all screen sizes

## 📁 Project Structure

```
/
├── app/          # The Next.js web application (Backend API + Frontend Gallery)
│   ├── db/       # SQLite database and initialization script
│   ├── public/   # Static assets, including screenshot uploads
│   └── src/      # Application source code
│       ├── app/  # Next.js app directory
│       │   ├── api/     # API routes (upload, gallery, delete)
│       │   └── ...      # Pages and layouts
│       ├── components/  # React components
│       │   └── ui/      # shadcn/ui components
│       └── lib/         # Utilities and database connection
└── extension/    # The Chromium browser extension
    ├── background.js    # Service worker for image fetching
    ├── content.js       # Content script for meta detection
    ├── manifest.json    # Extension configuration
    └── ...
```

## 🚀 Tech Stack

- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite (via `better-sqlite3`)
- **Screenshot Engine:** `html2canvas`
- **Browser Extension:** Standard Web APIs (Manifest V3)
- **UI Components:** Radix UI primitives via shadcn/ui
- **Animation:** Framer Motion (minimal usage)

## ⚙️ Setup and Installation

### Prerequisites
- Node.js (v18 or later recommended)
- A Chromium-based browser (e.g., Google Chrome, Brave)

### 1. Run the Web Application

First, set up and run the backend server and frontend gallery.

```bash
# 1. Navigate to the application directory
cd app

# 2. Install all dependencies
npm install

# 3. Initialize the SQLite database
# This only needs to be run once.
npm run db:init

# 4. Start the development server
npm run dev
```
Your GeoMeta Gallery will now be running at **http://localhost:3000**.

### 2. Load the Browser Extension

Next, install the extension in your browser.

1. Open your browser and navigate to the extensions page (e.g., `chrome://extensions`)
2. Enable **"Developer mode"** using the toggle switch, usually in the top-right corner
3. Click the **"Load unpacked"** button
4. In the file dialog, select the `extension` folder from the project directory

The "GeoMeta Collector" extension will now be installed and active.

### 3. IMPORTANT: Customize the Extension (One-Time Setup)

The extension relies on CSS selectors to find the "Learnable Meta" popup. These may change over time. If the extension is not capturing, you will need to update them.

1. Open the file: `extension/content.js`
2. At the top of the file, find the `META_POPUP_SELECTOR` constant:
   ```javascript
   const META_POPUP_SELECTOR = '.geometa-container';
   ```
3. Go to GeoGuessr, play a round, and when the meta popup appears, right-click it and select "Inspect" to open the developer tools
4. Find a stable, unique class name or ID for the main popup container and update the `META_POPUP_SELECTOR` value
5. Do the same for the other selectors inside the `extractMetadata` function if needed
6. Save the file and **reload the extension** from the `chrome://extensions` page

## 🎮 How It Works

1. You play a round of GeoGuessr
2. When the "Learnable Meta" popup appears, the **content script** detects it
3. The script pre-loads all images within the popup (including the flag) via the **background script** to handle cross-origin security
4. Flag images are automatically resized from SVG to proper PNG dimensions (29x17px)
5. It then uses `html2canvas` to take a high-fidelity screenshot of just the popup
6. The screenshot and all scraped metadata are sent to the local **backend API**
7. The API saves the image to disk and the metadata to the SQLite database
8. You can then open your private **web gallery** to view, search, filter, and study all your captured clues

## 🔧 API Endpoints

- **GET `/api/gallery`** - Retrieve screenshots with optional filtering
  - Query params: `country`, `q` (search)
- **POST `/api/upload`** - Upload new screenshot with metadata
- **DELETE `/api/delete?id={id}`** - Delete screenshot by ID

## 🎨 Gallery Features

- **Search:** Full-text search across all metadata
- **Filter:** Filter by specific countries
- **Grid View:** Responsive grid layout (3-8 columns based on screen size)
- **Modal View:** Click any screenshot to view in detail
- **Quiz Mode:** Hide metadata to test your knowledge
- **Download:** Save screenshots locally
- **Delete:** Remove unwanted screenshots
- **Responsive:** Works on desktop and mobile

## 🐛 Known Issues & Fixes

### ✅ Fixed Issues
- **Flag sizing problem:** Flags now display at correct size (29x17px)
- **Navigation handling:** Extension properly cancels old captures when navigating
- **Hydration errors:** Fixed React hydration issues in modal dialogs
- **Performance:** Removed unnecessary virtual scrolling complexity

### Current Limitations
- Extension only works on GeoGuessr (by design)
- Requires manual CSS selector updates if GeoGuessr changes their HTML structure
- Local storage only (no cloud sync)

## 🤝 Contributing

This is a personal learning tool, but feel free to fork and modify for your own use. The codebase is designed to be easily customizable.

## 📄 License

This project is for personal/educational use. Please respect GeoGuessr's terms of service when using this tool.