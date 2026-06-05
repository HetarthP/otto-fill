// Content script for JobFill AI.
// This file reads page form fields only when asked by the popup.

if (!globalThis.jobfillContentScriptLoaded) {
  globalThis.jobfillContentScriptLoaded = true;

  function getFieldLabel(element) {
    if (element.id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicitLabel && explicitLabel.textContent.trim()) {
        return explicitLabel.textContent.trim();
      }
    }

    const wrappingLabel = element.closest("label");
    if (wrappingLabel && wrappingLabel.textContent.trim()) {
      return wrappingLabel.textContent.trim();
    }

    return "";
  }

  function getFieldName(element) {
    return (
      getFieldLabel(element) ||
      element.getAttribute("aria-label") ||
      element.getAttribute("placeholder") ||
      element.name ||
      element.id ||
      "Unnamed field"
    );
  }

  function scanPageFields() {
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));

    return elements.map((element, index) => ({
      index,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || element.tagName.toLowerCase(),
      name: getFieldName(element),
      id: element.id || "",
      fieldName: element.name || "",
      placeholder: element.getAttribute("placeholder") || "",
      required: Boolean(element.required),
      disabled: Boolean(element.disabled),
      visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length)
    }));
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "JOBFILL_COLLECT_FIELDS") {
      return false;
    }

    try {
      sendResponse({
        ok: true,
        fields: scanPageFields()
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to scan page fields."
      });
    }

    return false;
  });
}
