const STORAGE_KEY = "jobfillProfile";
const AUTOFILL_CATEGORIES = new Set([
  "fullName",
  "email",
  "phone",
  "linkedin",
  "github",
  "portfolio",
  "school",
  "degree",
  "graduationYear"
]);

const scanButton = document.getElementById("scan-page");
const autofillButton = document.getElementById("autofill-page");
const optionsButton = document.getElementById("open-options");
const statusElement = document.getElementById("status");
const fieldList = document.getElementById("field-list");
let currentTabId = null;
let currentFillPlan = [];

function setStatus(message) {
  statusElement.textContent = message;
}

function clearFields() {
  fieldList.replaceChildren();
}

function maskValue(value) {
  if (!value) {
    return "";
  }

  if (value.length <= 4) {
    return "saved value";
  }

  return `${value.slice(0, 2)}...${value.slice(-2)}`;
}

function hasSafeInputType(field) {
  if (field.tagType === "textarea") {
    return true;
  }

  if (field.tagType !== "input") {
    return false;
  }

  return ["", "text", "email", "tel", "url", "search"].includes(field.inputType);
}

function canPreviewField(field, profile) {
  return (
    AUTOFILL_CATEGORIES.has(field.guessedCategory) &&
    Boolean(profile[field.guessedCategory]) &&
    field.visible &&
    !field.disabled &&
    !field.hasValue &&
    !field.isSensitive &&
    hasSafeInputType(field)
  );
}

function buildFillPlan(fields, profile) {
  return fields
    .filter((field) => canPreviewField(field, profile))
    .map((field) => ({
      index: field.index,
      category: field.guessedCategory,
      displayName: field.displayName || "Unnamed field",
      value: profile[field.guessedCategory]
    }));
}

function renderFields(fields, fillPlan) {
  clearFields();

  if (!fields.length) {
    setStatus("No input, textarea, or select fields found.");
    return;
  }

  const fillIndexes = new Set(fillPlan.map((item) => item.index));
  setStatus(
    `Detected ${fields.length} field${fields.length === 1 ? "" : "s"}. ` +
      `${fillPlan.length} ready for previewed autofill.`
  );

  fields.forEach((field) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const category = document.createElement("span");
    const meta = document.createElement("span");
    const preview = document.createElement("span");

    name.className = "field-name";
    name.textContent = field.displayName || "Unnamed field";

    category.className = "field-category";
    category.textContent = field.guessedCategory || "unknown";

    meta.className = "field-meta";
    meta.textContent = [
      field.tagType,
      field.inputType ? `type=${field.inputType}` : "",
      field.id ? `id=${field.id}` : "",
      field.name ? `name=${field.name}` : "",
      field.hasValue ? "has value" : "",
      field.required ? "required" : ""
    ].filter(Boolean).join(" · ");

    item.append(name, category, meta);

    if (fillIndexes.has(field.index)) {
      const fillItem = fillPlan.find((item) => item.index === field.index);
      preview.className = "field-preview";
      preview.textContent = `Preview: ${fillItem.category} -> ${maskValue(fillItem.value)}`;
      item.append(preview);
    }

    fieldList.append(item);
  });

}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function getSavedProfile() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

async function scanCurrentPage() {
  clearFields();
  currentTabId = null;
  currentFillPlan = [];
  scanButton.disabled = true;
  autofillButton.disabled = true;
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

    const profile = await getSavedProfile();
    currentTabId = tab.id;
    currentFillPlan = buildFillPlan(response.fields || [], profile);
    autofillButton.disabled = currentFillPlan.length === 0;
    renderFields(response.fields || [], currentFillPlan);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Scan failed.");
  } finally {
    scanButton.disabled = false;
  }
}

async function autofillCurrentPage() {
  if (!currentTabId || !currentFillPlan.length) {
    setStatus("Scan the page first to preview fillable fields.");
    return;
  }

  autofillButton.disabled = true;
  setStatus("Autofilling previewed fields...");

  try {
    const activeTab = await getActiveTab();

    if (!activeTab || activeTab.id !== currentTabId) {
      throw new Error("Scan this tab again before autofilling.");
    }

    const response = await chrome.runtime.sendMessage({
      type: "JOBFILL_AUTOFILL_PAGE",
      tabId: currentTabId,
      fillPlan: currentFillPlan
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Unable to autofill this page.");
    }

    const filledCount = response.filled?.length || 0;
    const skippedCount = response.skipped?.length || 0;
    currentFillPlan = [];
    setStatus(`Autofilled ${filledCount} field${filledCount === 1 ? "" : "s"}. ${skippedCount} skipped.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Autofill failed.");
    autofillButton.disabled = false;
  }
}

scanButton.addEventListener("click", scanCurrentPage);
autofillButton.addEventListener("click", autofillCurrentPage);

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
