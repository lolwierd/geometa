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

  if (message.action === "captureMeta") {
    const { image, metadata } = message;

    fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image, metadata }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Upload successful:", data);
        sendResponse({ status: "success", data });
      })
      .catch((error) => {
        console.error("Upload failed:", error);
        sendResponse({ status: "error", message: error.message });
      });

    return true; // Indicates an asynchronous response
  }
});
