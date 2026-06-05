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
const resumeFileInput = document.getElementById("resume-file");
const resumePreview = document.getElementById("resume-preview");
const resumePreviewList = document.getElementById("resume-preview-list");
const applyResumeButton = document.getElementById("apply-resume");
const clearResumeButton = document.getElementById("clear-resume");
let extractedResumeValues = null;

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

function bytesToBinaryString(bytes) {
  const chunks = [];
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.slice(index, index + chunkSize)));
  }

  return chunks.join("");
}

function binaryStringToBytes(value) {
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
}

function decodePdfString(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (match, escaped) => {
      const replacements = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\"
      };
      return replacements[escaped] || escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHexString(value) {
  const cleanValue = value.replace(/\s+/g, "");
  let text = "";

  for (let index = 0; index < cleanValue.length - 1; index += 2) {
    const code = parseInt(cleanValue.slice(index, index + 2), 16);
    if (Number.isFinite(code) && code > 0) {
      text += String.fromCharCode(code);
    }
  }

  return text;
}

function extractTextFromPdfContent(content) {
  const pieces = [];
  const stringPattern = /\((?:\\.|[^\\)])*\)|<([0-9a-fA-F\s]+)>/g;
  let match;

  while ((match = stringPattern.exec(content)) !== null) {
    const rawValue = match[0];

    if (rawValue.startsWith("(")) {
      pieces.push(decodePdfString(rawValue.slice(1, -1)));
    } else if (match[1]) {
      pieces.push(decodePdfHexString(match[1]));
    }
  }

  return pieces.join("\n");
}

async function inflatePdfStream(streamBytes) {
  if (!("DecompressionStream" in window)) {
    return "";
  }

  try {
    const stream = new Blob([streamBytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    const inflatedBuffer = await new Response(stream).arrayBuffer();
    return bytesToBinaryString(new Uint8Array(inflatedBuffer));
  } catch (error) {
    return "";
  }
}

async function readPdfText(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const binary = bytesToBinaryString(bytes);
  const textPieces = [];
  const streamPattern = /<<(.*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  let match;

  while ((match = streamPattern.exec(binary)) !== null) {
    const streamDictionary = match[1];
    const streamBytes = binaryStringToBytes(match[2]);

    if (/\/FlateDecode/.test(streamDictionary)) {
      const inflatedText = await inflatePdfStream(streamBytes);
      if (inflatedText) {
        textPieces.push(extractTextFromPdfContent(inflatedText));
      }
    } else {
      textPieces.push(extractTextFromPdfContent(match[2]));
    }
  }

  if (!textPieces.join("").trim()) {
    textPieces.push(extractTextFromPdfContent(binary));
  }

  return textPieces.join("\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function getLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findFirstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[0].trim() : "";
}

function extractName(lines) {
  return (
    lines.find((line) => {
      if (/@|https?:|github|linkedin|\d/.test(line.toLowerCase())) {
        return false;
      }

      const words = line.split(/\s+/);
      return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word));
    }) || ""
  );
}

function extractSection(lines, headingPattern) {
  const startIndex = lines.findIndex((line) => headingPattern.test(line));
  if (startIndex === -1) {
    return "";
  }

  const sectionLines = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^(education|experience|work experience|employment|professional experience|projects|skills|certifications)\b/i.test(lines[index])) {
      break;
    }

    sectionLines.push(lines[index]);

    if (sectionLines.length >= 6) {
      break;
    }
  }

  return sectionLines.join("\n").trim();
}

function extractResumeValues(text) {
  const lines = getLines(text);
  const education = extractSection(lines, /^education\b/i);
  const graduationYear = findFirstMatch(education || text, /\b(20\d{2}|19\d{2})\b/);

  return {
    fullName: extractName(lines),
    email: findFirstMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i),
    phone: findFirstMatch(text, /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/),
    linkedin: findFirstMatch(text, /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i),
    github: findFirstMatch(text, /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i),
    school: findFirstMatch(education, /[A-Z][A-Za-z .'-]*(?:University|College|Institute|School)[A-Za-z .'-]*/),
    degree: findFirstMatch(education, /\b(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate)[^\n,]*/i),
    graduationYear,
    education,
    experience: extractSection(lines, /^(experience|work experience|employment|professional experience)\b/i)
  };
}

function renderResumePreview(values) {
  const previewRows = [
    ["Full name", values.fullName],
    ["Email", values.email],
    ["Phone", values.phone],
    ["LinkedIn", values.linkedin],
    ["GitHub", values.github],
    ["School", values.school],
    ["Degree", values.degree],
    ["Graduation year", values.graduationYear],
    ["Education", values.education],
    ["Experience", values.experience]
  ];

  resumePreviewList.replaceChildren();

  previewRows.forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value || "Not found";

    resumePreviewList.append(term, description);
  });

  resumePreview.hidden = false;
}

function clearResumePreview() {
  extractedResumeValues = null;
  resumeFileInput.value = "";
  resumePreviewList.replaceChildren();
  resumePreview.hidden = true;
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

async function importResume(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("Choose a PDF resume file.", true);
    clearResumePreview();
    return;
  }

  setStatus("Parsing resume locally...");

  try {
    const resumeText = await readPdfText(file);

    if (!resumeText) {
      throw new Error("No readable text found in this PDF.");
    }

    extractedResumeValues = extractResumeValues(resumeText);
    renderResumePreview(extractedResumeValues);
    setStatus("Resume parsed locally. Review extracted values before applying.");
  } catch (error) {
    clearResumePreview();
    setStatus(error instanceof Error ? error.message : "Unable to parse this PDF.", true);
  }
}

function applyResumeValues() {
  if (!extractedResumeValues) {
    setStatus("Import and review a resume before applying values.", true);
    return;
  }

  const mappedValues = {
    fullName: extractedResumeValues.fullName,
    email: extractedResumeValues.email,
    phone: extractedResumeValues.phone,
    linkedin: extractedResumeValues.linkedin,
    github: extractedResumeValues.github,
    school: extractedResumeValues.school,
    degree: extractedResumeValues.degree,
    graduationYear: extractedResumeValues.graduationYear
  };

  const overwrites = Object.entries(mappedValues).filter(([fieldName, value]) => {
    const field = form.elements[fieldName];
    return field && value && field.value.trim() && field.value.trim() !== value;
  });

  if (overwrites.length) {
    const shouldOverwrite = window.confirm(
      `Apply extracted values and overwrite ${overwrites.length} existing profile field${overwrites.length === 1 ? "" : "s"} in the form?`
    );

    if (!shouldOverwrite) {
      setStatus("Resume values were not applied.");
      return;
    }
  }

  profileFields.forEach((fieldName) => {
    const field = form.elements[fieldName];
    const value = mappedValues[fieldName];

    if (field && value) {
      field.value = value;
    }
  });

  setStatus("Extracted values applied to the form. Select Save Profile to confirm storage.");
}

form.addEventListener("submit", saveProfile);
clearButton.addEventListener("click", clearProfile);
resumeFileInput.addEventListener("change", importResume);
applyResumeButton.addEventListener("click", applyResumeValues);
clearResumeButton.addEventListener("click", () => {
  clearResumePreview();
  setStatus("Resume preview cleared.");
});

loadProfile();
