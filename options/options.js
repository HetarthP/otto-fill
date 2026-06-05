const STORAGE_KEY = "jobfillProfile";

const profileFields = [
  "fullName",
  "email",
  "phone",
  "linkedin",
  "github",
  "portfolio",
  "address",
  "school",
  "degree",
  "graduationYear"
];

const form = document.getElementById("profile-form");
const clearButton = document.getElementById("clear-profile");
const statusElement = document.getElementById("status");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b42318" : "#0f766e";
}

function collectProfileFromForm() {
  return profileFields.reduce((profile, fieldName) => {
    const field = form.elements[fieldName];
    profile[fieldName] = field ? field.value.trim() : "";
    return profile;
  }, {});
}

function fillForm(profile) {
  profileFields.forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field) {
      field.value = profile?.[fieldName] || "";
    }
  });
}

async function loadProfile() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    fillForm(result[STORAGE_KEY] || {});
  } catch (error) {
    setStatus("Unable to load profile settings.", true);
  }
}

async function saveProfile(event) {
  event.preventDefault();
  setStatus("Saving...");

  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: collectProfileFromForm()
    });
    setStatus("Profile saved.");
  } catch (error) {
    setStatus("Unable to save profile settings.", true);
  }
}

async function clearProfile() {
  setStatus("Clearing...");

  try {
    await chrome.storage.local.remove(STORAGE_KEY);
    fillForm({});
    setStatus("Profile cleared.");
  } catch (error) {
    setStatus("Unable to clear profile settings.", true);
  }
}

form.addEventListener("submit", saveProfile);
clearButton.addEventListener("click", clearProfile);

loadProfile();
