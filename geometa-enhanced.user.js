// ==UserScript==
// @name         GeoMeta Enhanced Gallery
// @namespace    geometa-enhanced
// @version      2.0.0
// @author       geometa
// @description  Enhanced GeoGuessr meta capture with beautiful carousel gallery
// @icon         https://www.geoguessr.com/favicon.ico
// @downloadURL
// @updateURL
// @match        *://*.geoguessr.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @connect      localhost
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // Add comprehensive styles
  GM_addStyle(`
        .geometa-enhanced-gallery {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 95vw;
            max-width: 1200px;
            height: 90vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: none;
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .geometa-enhanced-gallery.active {
            display: flex;
            flex-direction: column;
        }

        .geometa-gallery-header {
            padding: 20px 25px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .geometa-gallery-title {
            color: white;
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .geometa-gallery-controls {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .geometa-search-container {
            position: relative;
        }

        .geometa-search-input {
            padding: 8px 35px 8px 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 14px;
            width: 250px;
            transition: all 0.3s ease;
        }

        .geometa-search-input:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
        }

        .geometa-search-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        .geometa-close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 8px 12px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .geometa-close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        .geometa-gallery-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .geometa-gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            max-height: 100%;
        }

        .geometa-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
        }

        .geometa-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            background: rgba(255, 255, 255, 0.15);
        }

        .geometa-card-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }

        .geometa-card-content {
            padding: 15px;
        }

        .geometa-card-country {
            color: white;
            font-weight: 600;
            margin: 0 0 5px 0;
            font-size: 1.1rem;
        }

        .geometa-card-date {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            margin: 0;
        }

        .geometa-card-delete {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(220, 53, 69, 0.8);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .geometa-card:hover .geometa-card-delete {
            opacity: 1;
        }

        .geometa-card-delete:hover {
            background: rgba(220, 53, 69, 1);
            transform: scale(1.1);
        }

        .geometa-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 15000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .geometa-modal.active {
            display: flex;
        }

        .geometa-modal-content {
            background: white;
            border-radius: 20px;
            max-width: 1000px;
            max-height: 90vh;
            width: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .geometa-modal-header {
            padding: 20px 25px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .geometa-modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            color: #333;
        }

        .geometa-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .geometa-carousel-container {
            position: relative;
            background: #f8f9fa;
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .geometa-carousel {
            position: relative;
            width: 100%;
            height: 400px;
            overflow: hidden;
        }

        .geometa-carousel-slide {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            transition: opacity 0.5s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .geometa-carousel-slide.active {
            opacity: 1;
        }

        .geometa-carousel-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 10px;
            cursor: zoom-in;
        }

        .geometa-carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
        }

        .geometa-carousel:hover .geometa-carousel-nav {
            opacity: 1;
        }

        .geometa-carousel-nav:hover {
            background: rgba(0, 0, 0, 0.7);
            transform: translateY(-50%) scale(1.1);
        }

        .geometa-carousel-nav.prev {
            left: 15px;
        }

        .geometa-carousel-nav.next {
            right: 15px;
        }

        .geometa-carousel-indicators {
            position: absolute;
            bottom: 15px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
        }

        .geometa-carousel-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .geometa-carousel-indicator.active {
            background: white;
            transform: scale(1.2);
        }

        .geometa-lens {
            position: absolute;
            pointer-events: none;
            border: 2px solid #aaa;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
            background-repeat: no-repeat;
        }

        .geometa-meta-info {
            padding: 25px;
            background: white;
        }

        .geometa-meta-section {
            margin-bottom: 20px;
        }

        .geometa-meta-section h3 {
            margin: 0 0 10px 0;
            font-weight: 600;
            color: #333;
        }

        .geometa-meta-note {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #007bff;
            color: #333;
            line-height: 1.5;
        }

        .geometa-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 24px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .geometa-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        }

        .geometa-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 20000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }

        .geometa-toast.show {
            opacity: 1;
            transform: translateX(0);
        }

        .geometa-toast.error {
            background: #dc3545;
        }

        .geometa-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: rgba(255, 255, 255, 0.8);
        }

        .geometa-empty-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }

        .geometa-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }

        .geometa-stat {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            color: white;
            flex: 1;
        }

        .geometa-stat-number {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .geometa-stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }

        @media (max-width: 768px) {
            .geometa-enhanced-gallery {
                width: 100vw;
                height: 100vh;
                border-radius: 0;
            }

            .geometa-gallery-grid {
                grid-template-columns: 1fr;
            }

            .geometa-search-input {
                width: 200px;
            }
        }
    `);

  // Constants
    const META_POPUP_SELECTOR = ".geometa-container";
    const STORAGE_KEY = "geometa_screenshots";

  // State management
  let popupObserver = null;
  let lastCapturedUrl = "";
  let currentCaptureID = 0;
  let screenshots = [];
  let filteredScreenshots = [];
  let currentModalIndex = 0;
  let searchQuery = "";

  // Utility functions
  function createElement(tag, className = "", innerHTML = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }

  function showToast(message, type = "success") {
    const toast = createElement("div", `geometa-toast ${type}`);
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function extractMetadata(popupElement) {
    const countryElement = popupElement.querySelector("strong");
    const country = countryElement ? countryElement.innerText.trim() : null;

    const flagElement = popupElement.querySelector("img.fi");
    const flagUrl = flagElement ? flagElement.src : null;

    const noteElement = popupElement.querySelector(".geometa-note");
    const note = noteElement ? noteElement.innerHTML.trim() : null;

    const footerElement = popupElement.querySelector(".geometa-footer");
    const footer = footerElement ? footerElement.innerHTML.trim() : null;

    const imageElements = popupElement.querySelectorAll(".responsive-image");
    const images = Array.from(imageElements).map((img) => img.src);

    if (!country) {
      console.warn("GeoMeta Enhanced: Could not find country in popup");
      return null;
    }

    return {
      country,
      flagUrl,
      note,
      footer,
      images,
      source_url: window.location.href,
      timestamp: new Date().toISOString(),
    };
  }

  function fetchImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        responseType: "blob",
        onload: (response) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(response.response);
        },
        onerror: reject,
      });
    });
  }

  async function preloadImages(popupElement) {
    const allImages = Array.from(popupElement.querySelectorAll("img"));
    const imagePromises = allImages.map(async (img) => {
      try {
        const dataUrl = await fetchImageAsDataURL(img.src);
        return { originalUrl: img.src, dataUrl };
      } catch (error) {
        console.warn(`Failed to load image ${img.src}:`, error);
        return { originalUrl: img.src, dataUrl: img.src };
      }
    });

    return Promise.all(imagePromises);
  }


    function saveToStorage(screenshot) {
      screenshots.unshift(screenshot);
      GM_setValue(STORAGE_KEY, JSON.stringify(screenshots));
      updateFilteredScreenshots();
    }

    function loadFromStorage() {
      try {
        const stored = GM_getValue(STORAGE_KEY, "[]");
        screenshots = JSON.parse(stored);
        updateFilteredScreenshots();
      } catch (error) {
        console.error("Failed to load from storage:", error);
        screenshots = [];
      }
    }

    function deleteScreenshot(id) {
      screenshots = screenshots.filter((s) => s.id !== id);
      GM_setValue(STORAGE_KEY, JSON.stringify(screenshots));
      updateFilteredScreenshots();
    }

    function updateFilteredScreenshots() {
      if (!searchQuery) {
        filteredScreenshots = [...screenshots];
      } else {
        const query = searchQuery.toLowerCase();
        filteredScreenshots = screenshots.filter(
          (s) =>
            s.metadata.country.toLowerCase().includes(query) ||
            (s.metadata.note && s.metadata.note.toLowerCase().includes(query)),
        );
      }

      if (document.querySelector(".geometa-enhanced-gallery.active")) {
        renderGallery();
      }
    }

  function captureMeta(popupElement) {
    const captureID = ++currentCaptureID;

    if (window.location.href === lastCapturedUrl) return;

    console.log(`GeoMeta Enhanced #${captureID}: Starting capture...`);

    const waitForContent = new Promise((resolve, reject) => {
      const maxRetries = 20;
      let retries = 0;
      const interval = setInterval(() => {
        if (captureID !== currentCaptureID) {
          clearInterval(interval);
          return reject(new Error(`Capture #${captureID} aborted`));
        }

        if (
          popupElement.querySelector(".responsive-image") &&
          popupElement.querySelector("strong") &&
          popupElement.querySelector("img.fi")
        ) {
          clearInterval(interval);
          resolve();
        } else if (++retries >= maxRetries) {
          clearInterval(interval);
          reject(new Error("Timeout waiting for popup content"));
        }
      }, 200);
    });

    waitForContent
      .then(async () => {
        if (captureID !== currentCaptureID) {
          throw new Error(`Capture #${captureID} aborted`);
        }

        console.log(
          `GeoMeta Enhanced #${captureID}: Content detected, pre-loading images...`,
        );

        const loadedImages = await preloadImages(popupElement);
        const imageDataMap = new Map(
          loadedImages.map((i) => [i.originalUrl, i.dataUrl]),
        );

        return html2canvas(popupElement, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll("img").forEach((clonedImg) => {
              const dataUrl = imageDataMap.get(clonedImg.src);
              if (dataUrl) clonedImg.src = dataUrl;
            });
          },
        });
      })
      .then(async (canvas) => {
        if (captureID !== currentCaptureID) {
          throw new Error(`Capture #${captureID} aborted`);
        }

        lastCapturedUrl = window.location.href;
        const metadata = extractMetadata(popupElement);
        if (!metadata) return;

        const base64Image = canvas.toDataURL("image/png");
        const imageData = base64Image.split(",")[1];

        // Create screenshot object
        const screenshot = {
          id: Date.now(),
          image_path: base64Image,
          metadata: metadata,
          country: metadata.country,
          created_at: metadata.timestamp,
        };

        // Save locally first
        saveToStorage(screenshot);
        showToast(`Captured meta for ${metadata.country}!`);

      })
      .catch((error) => {
        if (!error.message.includes("aborted")) {
          console.error(`GeoMeta Enhanced: ${error.message}`);
          showToast(`Capture failed: ${error.message}`, "error");
        }
      });
  }

  function observeDOM() {
    if (popupObserver) popupObserver.disconnect();

    popupObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const popup = node.matches(META_POPUP_SELECTOR)
              ? node
              : node.querySelector(META_POPUP_SELECTOR);
            if (popup) {
              console.log("GeoMeta Enhanced: Meta popup detected");
              captureMeta(popup);
              return;
            }
          }
        }
      }
    });

    popupObserver.observe(document.body, { childList: true, subtree: true });
  }

  function createCarousel(images, currentIndex = 0) {
    const container = createElement("div", "geometa-carousel-container");
    const carousel = createElement("div", "geometa-carousel");
    container.appendChild(carousel);

    if (!images || images.length === 0) {
      carousel.innerHTML =
        '<div style="text-align: center; padding: 50px; color: #666;">No images available</div>';
      return container;
    }

    let activeIndex = currentIndex;

    function renderSlides() {
      carousel.innerHTML = "";

      images.forEach((imgSrc, index) => {
        const slide = createElement(
          "div",
          `geometa-carousel-slide ${index === activeIndex ? "active" : ""}`,
        );
        const img = createElement("img", "geometa-carousel-image");
        img.src = imgSrc;
        img.alt = `Image ${index + 1}`;

        // Add zoom functionality
        let isZoomed = false;
        const lens = createElement("div", "geometa-lens");

        img.addEventListener("mouseenter", () => {
          if (!isZoomed) {
            slide.appendChild(lens);
            isZoomed = true;
          }
        });

        img.addEventListener("mouseleave", () => {
          if (isZoomed && lens.parentNode) {
            lens.parentNode.removeChild(lens);
            isZoomed = false;
          }
        });

        img.addEventListener("mousemove", (e) => {
          if (!isZoomed) return;

          const rect = img.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const lensSize = 150;
          const scale = 2;

          lens.style.width = lensSize + "px";
          lens.style.height = lensSize + "px";
          lens.style.left = x - lensSize / 2 + "px";
          lens.style.top = y - lensSize / 2 + "px";
          lens.style.backgroundImage = `url(${imgSrc})`;
          lens.style.backgroundSize = `${img.width * scale}px ${img.height * scale}px`;
          lens.style.backgroundPosition = `${-(x * scale - lensSize / 2)}px ${-(y * scale - lensSize / 2)}px`;
        });

        slide.appendChild(img);
        carousel.appendChild(slide);
      });

      // Add navigation if multiple images
      if (images.length > 1) {
        const prevBtn = createElement(
          "button",
          "geometa-carousel-nav prev",
          "❮",
        );
        const nextBtn = createElement(
          "button",
          "geometa-carousel-nav next",
          "❯",
        );

        prevBtn.addEventListener("click", () => {
          activeIndex = (activeIndex - 1 + images.length) % images.length;
          renderSlides();
        });

        nextBtn.addEventListener("click", () => {
          activeIndex = (activeIndex + 1) % images.length;
          renderSlides();
        });

        carousel.appendChild(prevBtn);
        carousel.appendChild(nextBtn);

        // Add indicators
        const indicators = createElement("div", "geometa-carousel-indicators");
        images.forEach((_, index) => {
          const indicator = createElement(
            "div",
            `geometa-carousel-indicator ${index === activeIndex ? "active" : ""}`,
          );
          indicator.addEventListener("click", () => {
            activeIndex = index;
            renderSlides();
          });
          indicators.appendChild(indicator);
        });
        carousel.appendChild(indicators);
      }
    }

    renderSlides();
    return container;
  }

  function openModal(screenshot, index) {
    const modal = document.querySelector(".geometa-modal") || createModal();
    currentModalIndex = index;

    const modalContent = modal.querySelector(".geometa-modal-content");
    modalContent.innerHTML = `
            <div class="geometa-modal-header">
                <h2 class="geometa-modal-title">${screenshot.metadata.country}</h2>
                <div>
                    <span style="color: #666; margin-right: 15px;">${formatDate(screenshot.created_at)}</span>
                    <button class="geometa-close-btn" onclick="closeModal()">✕</button>
                </div>
            </div>
            <div class="geometa-modal-body">
                <div class="geometa-carousel-container">
                    ${createCarouselHTML(screenshot)}
                </div>
                <div class="geometa-meta-info">
                    ${
                      screenshot.metadata.note
                        ? `
                        <div class="geometa-meta-section">
                            <h3>Meta Information</h3>
                            <div class="geometa-meta-note">${screenshot.metadata.note}</div>
                        </div>
                    `
                        : ""
                    }
                    ${
                      screenshot.metadata.footer
                        ? `
                        <div class="geometa-meta-section">
                            <h3>Source</h3>
                            <div class="geometa-meta-note">${screenshot.metadata.footer}</div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function createCarouselHTML(screenshot) {
    const images = [
      screenshot.image_path,
      ...(screenshot.metadata.images || []),
    ];
    return createCarousel(images).outerHTML;
  }

  function createModal() {
    const modal = createElement("div", "geometa-modal");
    modal.innerHTML = '<div class="geometa-modal-content"></div>';
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    return modal;
  }

  function closeModal() {
    const modal = document.querySelector(".geometa-modal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  function renderGallery() {
    const gallery = document.querySelector(".geometa-enhanced-gallery");
    if (!gallery) return;

    const content = gallery.querySelector(".geometa-gallery-content");
    const grid = content.querySelector(".geometa-gallery-grid");

    // Update stats
    const stats = gallery.querySelector(".geometa-stats");
    if (stats) {
      const totalCountries = new Set(screenshots.map((s) => s.metadata.country))
        .size;
      stats.innerHTML = `
                <div class="geometa-stat">
                    <div class="geometa-stat-number">${screenshots.length}</div>
                    <div class="geometa-stat-label">Screenshots</div>
                </div>
                <div class="geometa-stat">
                    <div class="geometa-stat-number">${totalCountries}</div>
                    <div class="geometa-stat-label">Countries</div>
                </div>
                <div class="geometa-stat">
                    <div class="geometa-stat-number">${filteredScreenshots.length}</div>
                    <div class="geometa-stat-label">Showing</div>
                </div>
            `;
    }

    if (filteredScreenshots.length === 0) {
      grid.innerHTML = `
                <div class="geometa-empty-state">
                    <div class="geometa-empty-icon">📸</div>
                    <h3>No screenshots found</h3>
                    <p>${searchQuery ? "Try adjusting your search" : "Start playing GeoGuessr to capture some meta!"}</p>
                </div>
            `;
      return;
    }

    grid.innerHTML = "";
    filteredScreenshots.forEach((screenshot, index) => {
      const card = createElement("div", "geometa-card");
      card.innerHTML = `
                <img src="${screenshot.image_path}" alt="${screenshot.metadata.country}" class="geometa-card-image">
                <div class="geometa-card-content">
                    <h3 class="geometa-card-country">${screenshot.metadata.country}</h3>
                    <p class="geometa-card-date">${formatDate(screenshot.created_at)}</p>
                </div>
                <button class="geometa-card-delete" title="Delete screenshot">🗑️</button>
            `;

      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("geometa-card-delete")) {
          openModal(screenshot, index);
        }
      });

      card
        .querySelector(".geometa-card-delete")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`Delete screenshot of ${screenshot.metadata.country}?`)) {
            deleteScreenshot(screenshot.id);
            showToast("Screenshot deleted");
          }
        });

      grid.appendChild(card);
    });
  }

  function createGallery() {
    const gallery = createElement("div", "geometa-enhanced-gallery");
    gallery.innerHTML = `
            <div class="geometa-gallery-header">
                <h1 class="geometa-gallery-title">GeoMeta Gallery</h1>
                <div class="geometa-gallery-controls">
                    <div class="geometa-search-container">
                        <input type="text" class="geometa-search-input" placeholder="Search countries or notes...">
                    </div>
                    <button class="geometa-close-btn">Close</button>
                </div>
            </div>
            <div class="geometa-gallery-content">
                <div class="geometa-stats"></div>
                <div class="geometa-gallery-grid"></div>
            </div>
        `;

    // Add event listeners
    const searchInput = gallery.querySelector(".geometa-search-input");
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      updateFilteredScreenshots();
    });

    const closeBtn = gallery.querySelector(".geometa-close-btn");
    closeBtn.addEventListener("click", () => {
      gallery.classList.remove("active");
      document.body.style.overflow = "";
    });

    document.body.appendChild(gallery);
    return gallery;
  }

  function createFAB() {
    const fab = createElement("button", "geometa-fab", "📸");
    fab.title = "Open GeoMeta Gallery";
    fab.addEventListener("click", () => {
      const gallery =
        document.querySelector(".geometa-enhanced-gallery") || createGallery();
      gallery.classList.add("active");
      document.body.style.overflow = "hidden";
      renderGallery();
    });

    document.body.appendChild(fab);
    return fab;
  }

  function initializeApp() {
    // Load screenshots from storage
    loadFromStorage();

    // Create FAB
    createFAB();

    // Start observing for meta popups
    observeDOM();

    // Handle URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        lastCapturedUrl = "";
        observeDOM();
      }
    }).observe(document, { subtree: true, childList: true });

    console.log("GeoMeta Enhanced: Initialized successfully");
  }

  // Global functions for modal controls
  window.closeModal = closeModal;

  // Register menu commands
  GM_registerMenuCommand("Open Gallery", () => {
    const gallery =
      document.querySelector(".geometa-enhanced-gallery") || createGallery();
    gallery.classList.add("active");
    document.body.style.overflow = "hidden";
    renderGallery();
  });

  GM_registerMenuCommand("Clear All Data", () => {
    if (
      confirm(
        "Are you sure you want to delete all screenshots? This cannot be undone.",
      )
    ) {
      screenshots = [];
      GM_setValue(STORAGE_KEY, "[]");
      updateFilteredScreenshots();
      showToast("All data cleared");
    }
  });

  GM_registerMenuCommand("Export Data", () => {
    const dataStr = JSON.stringify(screenshots, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `geometa-screenshots-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    showToast("Data exported successfully");
  });

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }
})();
