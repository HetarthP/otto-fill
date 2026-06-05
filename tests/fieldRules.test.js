const assert = require("node:assert/strict");
const {
  canAutofillField,
  guessFieldCategory,
  isSensitiveField
} = require("../src/fieldRules");

function makeField(overrides = {}) {
  return {
    tagType: "input",
    inputType: "text",
    id: "",
    name: "",
    placeholder: "",
    ariaLabel: "",
    nearbyLabelText: "",
    guessedCategory: "unknown",
    disabled: false,
    visible: true,
    ...overrides
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("classifies safe profile fields conservatively", () => {
  const cases = [
    ["fullName", makeField({ nearbyLabelText: "Full name" })],
    ["email", makeField({ inputType: "email", nearbyLabelText: "Email address" })],
    ["phone", makeField({ inputType: "tel", nearbyLabelText: "Phone" })],
    ["linkedin", makeField({ placeholder: "LinkedIn profile URL" })],
    ["github", makeField({ placeholder: "GitHub profile URL" })],
    ["portfolio", makeField({ nearbyLabelText: "Portfolio URL" })],
    ["address", makeField({ nearbyLabelText: "Street address" })],
    ["school", makeField({ nearbyLabelText: "University" })],
    ["degree", makeField({ nearbyLabelText: "Degree" })],
    ["graduationYear", makeField({ nearbyLabelText: "Graduation year" })]
  ];

  cases.forEach(([expectedCategory, field]) => {
    assert.equal(guessFieldCategory(field), expectedCategory);
  });
});

test("leaves unclear fields unknown", () => {
  assert.equal(guessFieldCategory(makeField({ nearbyLabelText: "Tell us about yourself" })), "unknown");
});

test("allows safe empty high-confidence fields", () => {
  const field = makeField({
    inputType: "email",
    guessedCategory: "email",
    nearbyLabelText: "Email address"
  });

  assert.equal(canAutofillField(field, "person@example.com", ""), true);
});

test("does not autofill sensitive fields", () => {
  const cases = [
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Password" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Passcode" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "SSN" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Social Security Number" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "SIN" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Social Insurance Number" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Salary expectations" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Desired compensation" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Are you authorized to work?" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Visa sponsorship required" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Race" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Ethnicity" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Gender" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Veteran status" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Disability status" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Credit card number" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "CVV" }),
    makeField({ guessedCategory: "fullName", nearbyLabelText: "Payment information" })
  ];

  cases.forEach((field) => {
    assert.equal(isSensitiveField(field), true);
    assert.equal(canAutofillField(field, "Example Value", ""), false);
  });
});

test("does not autofill unsupported or unsafe field states", () => {
  const baseField = {
    guessedCategory: "email",
    nearbyLabelText: "Email address"
  };

  assert.equal(canAutofillField(makeField({ guessedCategory: "address", nearbyLabelText: "Street address" }), "123 Main St", ""), false);
  assert.equal(canAutofillField(makeField({ ...baseField, visible: false }), "person@example.com", ""), false);
  assert.equal(canAutofillField(makeField({ ...baseField, disabled: true }), "person@example.com", ""), false);
  assert.equal(canAutofillField(makeField({ ...baseField, tagType: "select" }), "person@example.com", ""), false);
  assert.equal(canAutofillField(makeField({ ...baseField, inputType: "password" }), "person@example.com", ""), false);
  assert.equal(canAutofillField(makeField(baseField), "person@example.com", "existing@example.com"), false);
});
