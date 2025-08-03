// Function to fetch an image and convert it to a data URL
function fetchImageAsDataURL(url) {
  return fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchImage") {
    fetchImageAsDataURL(message.url)
      .then((dataUrl) => sendResponse({ status: "success", dataUrl }))
      .catch((error) =>
        sendResponse({ status: "error", message: error.message }),
      );
    return true; // Indicates an asynchronous response
  }

});
