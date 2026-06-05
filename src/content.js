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

  const SENSITIVE_FIELD_PATTERNS = [
    /\bpassword\b/,
    /\bpasscode\b/,
    /\bssn\b/,
    /\bsocial\s*security\b/,
    /\bsin\b/,
    /\bsocial\s*insurance\b/,
    /\bgovernment\s*id\b/,
    /\bnational\s*id\b/,
    /\bdriver'?s?\s*license\b/,
    /\bpassport\b/,
    /\bcredit\s*card\b/,
    /\bcard\s*number\b/,
    /\bcvv\b/,
    /\bcvc\b/,
    /\bpayment\b/,
    /\bsalary\b/,
    /\bcompensation\b/,
    /\bexpected\s*pay\b/,
    /\bwork\s*authorization\b/,
    /\bauthorized\s*to\s*work\b/,
    /\bsponsorship\b/,
    /\bvisa\b/,
    /\brace\b/,
    /\bethnicity\b/,
    /\bgender\b/,
    /\bveteran\b/,
    /\bdisability\b/
  ];

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

  function isSensitiveField(field) {
    const searchText = getSearchText(field);
    return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(searchText));
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
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
        hasValue: Boolean(element.value && element.value.trim())
      };

      field.displayName = getDisplayName(field);
      field.guessedCategory = guessFieldCategory(field);
      field.isSensitive = isSensitiveField(field);

      return field;
    });
  }

  function canAutofillElement(element, field, value) {
    if (!AUTOFILL_CATEGORIES.has(field.guessedCategory)) {
      return false;
    }

    if (!value || field.disabled || !field.visible || isSensitiveField(field)) {
      return false;
    }

    if (element.value && element.value.trim()) {
      return false;
    }

    if (field.tagType === "textarea") {
      return true;
    }

    if (field.tagType === "select") {
      return false;
    }

    if (field.tagType !== "input") {
      return false;
    }

    return ["", "text", "email", "tel", "url", "search"].includes(field.inputType);
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
