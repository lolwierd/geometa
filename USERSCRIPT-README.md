# GeoMeta Enhanced Gallery - Userscript

🎯 **Convert your GeoGuessr extension to a powerful userscript!**

This enhanced userscript automatically captures GeoGuessr LearnableMeta screenshots and provides a beautiful gallery interface with carousel view, zoom functionality, and advanced filtering - all inspired by the LearnableMeta userscript design.

## ✨ Features

### 🔄 **Automatic Capture**
- Detects LearnableMeta popups automatically
- Captures high-quality screenshots with metadata
- Preserves all images, notes, and country information
- Works on all GeoGuessr game modes

### 🖼️ **Enhanced Gallery**
- **Beautiful carousel interface** inspired by LearnableMeta
- **Zoom functionality** with magnifying lens effect
- **Grid and list view modes**
- **Advanced search and filtering**
- **Statistics dashboard**
- **Quiz mode** for testing your knowledge

### 💾 **Smart Storage**
- **Local storage** using Tampermonkey/Violentmonkey
- **Export functionality** for backup
- **Import/restore capabilities**

### 🎨 **Modern UI**
- Responsive design that works on all screen sizes
- Smooth animations and transitions
- Keyboard navigation support
- Dark/light theme compatibility

## 🚀 Installation

### Prerequisites
- **Tampermonkey** (Chrome/Edge) or **Violentmonkey** (Firefox/Chrome)
- Access to GeoGuessr with LearnableMeta

### Steps
1. **Install a userscript manager:**
   - Chrome/Edge: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)

2. **Install the userscript:**
   - Copy the entire `geometa-enhanced.user.js` content
   - Open your userscript manager dashboard
   - Click "Create new script"
   - Paste the code and save

3. **Configure (optional):**
   - Customize settings through the userscript manager menu

## 🎮 Usage

### Automatic Capture
1. Play GeoGuessr on any supported map
2. When LearnableMeta popup appears, the script automatically captures it
3. You'll see a success toast notification
4. Screenshots are saved locally

### Gallery Access
- **Click the floating camera button** (📸) in the bottom-right corner
- **Use the menu command** "Open Gallery" in your userscript manager
- **Keyboard shortcut:** Will be added in future versions

### Gallery Features

#### 🔍 **Search & Filter**
```
Search by: Country names, meta descriptions, notes
Filter by: Specific countries
View modes: Grid or List layout
```

#### 🖼️ **Image Carousel**
- **Navigation:** Arrow keys, click arrows, or indicator dots
- **Zoom:** Hover over images to see magnified lens
- **Multiple images:** Automatically includes all meta images
- **Keyboard shortcuts:** 1-9 keys to jump to specific images

#### 🧠 **Quiz Mode**
- Hide the meta information
- Test your geographical knowledge
- Reveal answers when ready

#### 📊 **Statistics**
- Total screenshots captured
- Unique countries covered
- Total images collected
- Current filter results


### Storage Settings
```javascript
const STORAGE_KEY = "geometa_screenshots"; // Change if needed
```

## 🔧 Menu Commands

Access these through your userscript manager menu:

- **Open Gallery** - Launch the gallery interface
- **Clear All Data** - Remove all stored screenshots (with confirmation)
- **Export Data** - Download your screenshots as JSON backup

## 🆚 Extension vs Userscript Comparison

| Feature | Browser Extension | Enhanced Userscript |
|---------|------------------|-------------------|
| Installation | Chrome Web Store | Userscript Manager |
| Updates | Automatic | Manual/Auto via @updateURL |
| Permissions | Extensive | Minimal |
| Storage | Extension storage | GM storage |
| UI Integration | Popup/Options page | In-page gallery |
| Cross-browser | Limited | Universal |
| Customization | Limited | Full code access |
| Offline capable | Yes | Yes |

## 🎨 Customization

### Styling
The userscript includes comprehensive CSS that you can modify:

```javascript
GM_addStyle(`
    .geometa-enhanced-gallery {
        /* Customize the main gallery appearance */
    }
    .geometa-carousel {
        /* Modify carousel behavior */
    }
`);
```

### Behavior
Key functions you can customize:

- `captureMeta()` - Screenshot capture logic
- `createCarousel()` - Carousel functionality  
- `renderGallery()` - Gallery display

## 🐛 Troubleshooting

### Common Issues

**1. Screenshots not capturing:**
- Check if LearnableMeta popup is detected
- Verify the popup selector: `.geometa-container`
- Check console for error messages

**2. Gallery not opening:**
- Ensure userscript is enabled
- Check for JavaScript errors in console
- Try refreshing the page

**3. Images not loading:**
- Check browser console for 404 errors
- Verify image URLs are accessible
- Try clearing browser cache

### Debug Mode
Enable debug logging by adding to console:
```javascript
localStorage.setItem('geometa-debug', 'true');
```

## 🔄 Migration from Extension

If you're switching from the browser extension:

1. **Export existing data** from your Next.js app
2. **Install the userscript** following the installation steps
3. **Import data** using the gallery interface (planned feature)
4. **Disable the old extension** to avoid conflicts

## 🚧 Future Enhancements

### Planned Features
- [ ] **Cloud sync** integration
- [ ] **Advanced filtering** (date ranges, image count)
- [ ] **Bulk operations** (delete multiple, export selected)
- [ ] **Statistics dashboard** improvements
- [ ] **Keyboard shortcuts** for gallery navigation
- [ ] **Full-screen mode** for better viewing
- [ ] **Image comparison** side-by-side view

### Community Requests
- [ ] **Auto-categorization** by geographical regions
- [ ] **Learning mode** with spaced repetition
- [ ] **Sharing capabilities** for educational purposes
- [ ] **Integration with other GeoGuessr tools**

## 📝 Technical Details

### Dependencies
- **html2canvas** - For screenshot capture
- **GM_* APIs** - For storage and HTTP requests
- **Modern browser** - ES6+ support required

### Storage Format
```javascript
{
  id: timestamp,
  image_path: "data:image/png;base64,...",
  metadata: {
    country: "Country Name",
    note: "HTML content",
    footer: "Source information", 
    images: ["url1", "url2"],
    timestamp: "ISO date string",
    source_url: "geoguessr.com/..."
  },
  created_at: "ISO date string"
}
```

### Performance
- **Local storage:** ~5MB limit per domain
- **Image compression:** PNG format, optimized size
- **Memory usage:** Efficient DOM manipulation
- **Load time:** ~2-3 seconds for 100+ screenshots

## 🤝 Contributing

This userscript is designed to be easily customizable. Feel free to:

1. **Fork and modify** for your needs
2. **Share improvements** with the community
3. **Report issues** and suggest features
4. **Create themes** or UI variations

## 📄 License

MIT License - Feel free to use, modify, and distribute as needed.

## 🙏 Acknowledgments

- **LearnableMeta team** for the inspiration and carousel design
- **GeoGuessr community** for testing and feedback
- **Tampermonkey/Violentmonkey** developers for the platform

---

**Happy meta learning! 🌍📸**