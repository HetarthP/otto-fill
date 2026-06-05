// JobFill AI background service worker.
// Keeps cross-extension coordination in one place as the project grows.

chrome.runtime.onInstalled.addListener(() => {
  console.log("JobFill AI installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "JOBFILL_SCAN_PAGE") {
    return false;
  }

  injectAndScanTab(message.tabId, sendResponse);

  // Required because sendResponse is called asynchronously.
  return true;
});

async function injectAndScanTab(tabId, sendResponse) {
  try {
    if (!tabId) {
      throw new Error("No active tab found.");
    }

    // Inject only after the user clicks Scan Page, keeping page access explicit.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"]
    });

    chrome.tabs.sendMessage(tabId, { type: "JOBFILL_COLLECT_FIELDS" }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error: chrome.runtime.lastError.message || "Unable to scan this page."
        });
        return;
      }

      sendResponse(response || { ok: false, error: "No scan response received." });
    });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to scan this page."
    });
  }
}
