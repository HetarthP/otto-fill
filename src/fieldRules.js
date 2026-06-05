(function initFieldRules(root) {
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

  function canAutofillField(field, value, currentValue) {
    if (!AUTOFILL_CATEGORIES.has(field.guessedCategory)) {
      return false;
    }

    if (!value || field.disabled || !field.visible || isSensitiveField(field)) {
      return false;
    }

    if (currentValue && currentValue.trim()) {
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

  const api = {
    AUTOFILL_CATEGORIES,
    canAutofillField,
    getSearchText,
    guessFieldCategory,
    isSensitiveField
  };

  root.JobFillFieldRules = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
