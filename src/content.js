// Content script for JobFill AI.
// This file reads page form fields only when asked by the popup.

if (!globalThis.jobfillContentScriptLoaded) {
  globalThis.jobfillContentScriptLoaded = true;

  const fieldRules = globalThis.JobFillFieldRules;

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

  function getDisplayName(field) {
    return (
      field.nearbyLabelText ||
      field.ariaLabel ||
      field.placeholder ||
      field.name ||
      field.id ||
      "Unnamed field"
    );
  }

  function scanPageFields() {
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));

    return elements.map((element, index) => {
      const tagType = element.tagName.toLowerCase();
      const inputType = tagType === "input" ? (element.getAttribute("type") || "text") : "";
      const field = {
        index,
        tagType,
        inputType,
        id: element.id || "",
        name: element.name || "",
        placeholder: element.getAttribute("placeholder") || "",
        ariaLabel: element.getAttribute("aria-label") || "",
        nearbyLabelText: getFieldLabel(element),
        required: Boolean(element.required),
        disabled: Boolean(element.disabled),
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
        hasValue: Boolean(element.value && element.value.trim())
      };

      field.displayName = getDisplayName(field);
      field.guessedCategory = fieldRules.guessFieldCategory(field);
      field.isSensitive = fieldRules.isSensitiveField(field);

      return field;
    });
  }

  function canAutofillElement(element, field, value) {
    return fieldRules.canAutofillField(field, value, element.value);
  }

  function autofillFields(fillPlan) {
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));
    const scannedFields = scanPageFields();
    const filled = [];
    const skipped = [];

    fillPlan.forEach((item) => {
      const element = elements[item.index];
      const field = scannedFields[item.index];

      if (!element || !field || field.guessedCategory !== item.category) {
        skipped.push({ ...item, reason: "Field changed before autofill." });
        return;
      }

      if (!canAutofillElement(element, field, item.value)) {
        skipped.push({ ...item, reason: "Field is not safe to autofill." });
        return;
      }

      element.value = item.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push({
        index: item.index,
        category: item.category,
        displayName: field.displayName
      });
    });

    return { filled, skipped };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !["JOBFILL_COLLECT_FIELDS", "JOBFILL_AUTOFILL_FIELDS"].includes(message.type)) {
      return false;
    }

    try {
      if (message.type === "JOBFILL_AUTOFILL_FIELDS") {
        sendResponse({
          ok: true,
          ...autofillFields(message.fillPlan || [])
        });
        return false;
      }

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
