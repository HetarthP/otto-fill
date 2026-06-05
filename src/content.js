// Content script for JobFill AI.
// This file reads page form fields only when asked by the popup.

if (!globalThis.jobfillContentScriptLoaded) {
  globalThis.jobfillContentScriptLoaded = true;

  const FIELD_CATEGORIES = {
    fullName: [
      /\bfull\s*name\b/,
      /\blegal\s*name\b/,
      /\bcandidate\s*name\b/,
      /\bapplicant\s*name\b/
    ],
    email: [
      /\be-?mail\b/,
      /\bemail\s*address\b/
    ],
    phone: [
      /\bphone\b/,
      /\bmobile\b/,
      /\bcell\b/,
      /\btelephone\b/
    ],
    linkedin: [
      /\blinkedin\b/,
      /\blinkedin\s*profile\b/,
      /\blinkedin\s*url\b/
    ],
    github: [
      /\bgithub\b/,
      /\bgithub\s*profile\b/,
      /\bgithub\s*url\b/
    ],
    portfolio: [
      /\bportfolio\b/,
      /\bpersonal\s*website\b/,
      /\bportfolio\s*url\b/
    ],
    address: [
      /\baddress\b/,
      /\bstreet\s*address\b/,
      /\bmailing\s*address\b/
    ],
    school: [
      /\bschool\b/,
      /\buniversity\b/,
      /\bcollege\b/,
      /\binstitution\b/
    ],
    degree: [
      /\bdegree\b/,
      /\bmajor\b/,
      /\bfield\s*of\s*study\b/
    ],
    graduationYear: [
      /\bgraduation\s*year\b/,
      /\bgrad\s*year\b/,
      /\byear\s*of\s*graduation\b/
    ]
  };

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

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getSearchText(field) {
    return normalizeText([
      field.id,
      field.name,
      field.placeholder,
      field.ariaLabel,
      field.nearbyLabelText
    ].join(" "));
  }

  function guessFieldCategory(field) {
    const searchText = getSearchText(field);

    if (!searchText) {
      return "unknown";
    }

    // Type-based matches are narrow and only used for strong browser-native hints.
    if (field.tagType === "input" && field.inputType === "email") {
      return "email";
    }

    if (field.tagType === "input" && field.inputType === "tel") {
      return "phone";
    }

    for (const [category, patterns] of Object.entries(FIELD_CATEGORIES)) {
      if (patterns.some((pattern) => pattern.test(searchText))) {
        return category;
      }
    }

    return "unknown";
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
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length)
      };

      field.displayName = getDisplayName(field);
      field.guessedCategory = guessFieldCategory(field);

      return field;
    });
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
