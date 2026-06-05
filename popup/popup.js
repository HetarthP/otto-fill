const scanButton = document.getElementById("scan-page");
const optionsButton = document.getElementById("open-options");
const statusElement = document.getElementById("status");
const fieldList = document.getElementById("field-list");

function setStatus(message) {
  statusElement.textContent = message;
}

function clearFields() {
  fieldList.replaceChildren();
}

function renderFields(fields) {
  clearFields();

  if (!fields.length) {
    setStatus("No input, textarea, or select fields found.");
    return;
  }

  setStatus(`Detected ${fields.length} field${fields.length === 1 ? "" : "s"}.`);

  fields.slice(0, 25).forEach((field) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const meta = document.createElement("span");

    name.className = "field-name";
    name.textContent = field.name;

    meta.className = "field-meta";
    meta.textContent = `${field.tag}${field.type ? `:${field.type}` : ""}${field.required ? " · required" : ""}`;

    item.append(name, meta);
    fieldList.append(item);
  });

  if (fields.length > 25) {
    const item = document.createElement("li");
    item.textContent = `Showing first 25 of ${fields.length} fields.`;
    fieldList.append(item);
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function scanCurrentPage() {
  clearFields();
  scanButton.disabled = true;
  setStatus("Scanning page...");

  try {
    const tab = await getActiveTab();

    if (!tab || !tab.id) {
      throw new Error("No active tab found.");
    }

    const response = await chrome.runtime.sendMessage({
      type: "JOBFILL_SCAN_PAGE",
      tabId: tab.id
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Unable to scan this page.");
    }

    renderFields(response.fields || []);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Scan failed.");
  } finally {
    scanButton.disabled = false;
  }
}

scanButton.addEventListener("click", scanCurrentPage);

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
