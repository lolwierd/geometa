const META_POPUP_SELECTOR = ".geometa-container";

let popupObserver = null;
let lastCapturedUrl = "";
let currentCaptureID = 0; // The key for our cancellation logic

function extractMetadata(popupElement) {
  const countryElement = popupElement.querySelector("strong");
  const country = countryElement ? countryElement.innerText.trim() : null;

  const flagElement = popupElement.querySelector("img.fi");
  const flagUrl = flagElement ? flagElement.src : null;

  const noteElement = popupElement.querySelector(".geometa-note");
  const note = noteElement ? noteElement.innerText.trim() : null;

  const footerElement = popupElement.querySelector(".geometa-footer");
  const footer = footerElement ? footerElement.innerText.trim() : null;

  const imageElements = popupElement.querySelectorAll(".responsive-image");
  const images = Array.from(imageElements).map((img) => img.src);

  if (!country) {
    console.warn(
      "GeoMeta Collector: Could not find country in the popup during extraction.",
    );
    return null;
  }

  return {
    country,
    flagUrl,
    note,
    footer,
    images,
    source_url: window.location.href,
  };
}

// Function to check if URL is a flag image
function isFlagUrl(url) {
  return (
    url.includes("country-flag-icons") ||
    url.includes("/flags/") ||
    url.match(/\/[A-Z]{2}\.(svg|png)$/)
  );
}

// Function to resize image using canvas in content script
function resizeImageToFlag(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      canvas.width = 29; // Target flag width
      canvas.height = 17; // Target flag height

      // Draw the image scaled to exact dimensions
      ctx.drawImage(img, 0, 0, 29, 17);

      // Convert to dataURL
      const resizedDataUrl = canvas.toDataURL("image/png");
      resolve(resizedDataUrl);
    };

    img.onerror = () => reject(new Error("Failed to load image for resizing"));
    img.src = dataUrl;
  });
}

function fetchImageViaBackground(url) {
  return new Promise((resolve, reject) => {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      return reject(new Error("Extension context invalidated."));
    }
    chrome.runtime.sendMessage({ action: "fetchImage", url }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.status === "success") {
        // Check if this is a flag image that needs resizing
        if (isFlagUrl(url)) {
          console.log("🚩 Resizing flag image:", url);
          resizeImageToFlag(response.dataUrl)
            .then((resizedDataUrl) => {
              resolve({ originalUrl: url, dataUrl: resizedDataUrl });
            })
            .catch((resizeError) => {
              console.error("Flag resize failed, using original:", resizeError);
              resolve({ originalUrl: url, dataUrl: response.dataUrl });
            });
        } else {
          resolve({ originalUrl: url, dataUrl: response.dataUrl });
        }
      } else {
        reject(
          new Error(
            response
              ? `Failed to fetch image: ${response.message}`
              : "Unknown error fetching image.",
          ),
        );
      }
    });
  });
}

function captureMeta(popupElement) {
  const captureID = ++currentCaptureID; // Assign a unique ID to this capture attempt

  if (window.location.href === lastCapturedUrl) return;

  const waitForContent = new Promise((resolve, reject) => {
    const maxRetries = 20; // 4 seconds timeout
    let retries = 0;
    const interval = setInterval(() => {
      if (captureID !== currentCaptureID) {
        // Check if a newer capture has started
        clearInterval(interval);
        return reject(new Error(`Capture #${captureID} aborted.`));
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
        reject(new Error("Timed out waiting for popup content."));
      }
    }, 200);
  });

  waitForContent
    .then(() => {
      if (captureID !== currentCaptureID)
        throw new Error(`Capture #${captureID} aborted.`);
      console.log(
        `GeoMeta Collector #${captureID}: Content detected. Pre-loading all images...`,
      );
      const allImages = Array.from(popupElement.querySelectorAll("img"));
      const imagePromises = allImages.map((img) =>
        fetchImageViaBackground(img.src),
      );

      return Promise.all(imagePromises).then((loadedImages) => ({
        loadedImages,
      }));
    })
    .then(({ loadedImages }) => {
      if (captureID !== currentCaptureID)
        throw new Error(`Capture #${captureID} aborted.`);
      console.log(
        `GeoMeta Collector #${captureID}: All images pre-loaded. Capturing div...`,
      );
      lastCapturedUrl = window.location.href;
      const metadata = extractMetadata(popupElement);
      if (!metadata) return;

      const imageDataMap = new Map(
        loadedImages.map((i) => [i.originalUrl, i.dataUrl]),
      );

      html2canvas(popupElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (element) =>
          element.tagName === "CANVAS" && !popupElement.contains(element),
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll("img").forEach((clonedImg) => {
            const dataUrl = imageDataMap.get(clonedImg.src);
            if (dataUrl) {
              clonedImg.src = dataUrl;
            }
          });
        },
      }).then((canvas) => {
        if (captureID !== currentCaptureID)
          throw new Error(`Capture #${captureID} aborted.`);
        const base64Image = canvas.toDataURL("image/png").split(",")[1];
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(
            { action: "captureMeta", image: base64Image, metadata },
            (response) => {
              if (chrome.runtime.lastError)
                console.error(
                  `GeoMeta Collector #${captureID}: Message failed:`,
                  chrome.runtime.lastError.message,
                );
              else if (response && response.status === "success")
                console.log(
                  `GeoMeta Collector #${captureID}: Capture successful.`,
                  response.data,
                );
              else
                console.error(
                  `GeoMeta Collector #${captureID}: Capture failed.`,
                  response ? response.message : "No response.",
                );
            },
          );
        }
      });
    })
    .catch((error) => {
      if (error.message.includes("aborted")) {
        console.log(error.message); // Log abortions calmly
      } else {
        console.error(`GeoMeta Collector: ${error.message}`);
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
            console.log("GeoMeta Collector: Meta popup container detected.");
            captureMeta(popup);
            return;
          }
        }
      }
    }
  });
  popupObserver.observe(document.body, { childList: true, subtree: true });
  console.log("GeoMeta Collector: Observing for meta popup.");
}

observeDOM();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    lastCapturedUrl = ""; // Reset to allow captures on new round
    observeDOM();
  }
}).observe(document, { subtree: true, childList: true });
