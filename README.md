# JobFill AI

JobFill AI is a privacy-first Chrome Extension Manifest V3 project for helping with job application forms. This first version stores a local profile, scans the active page for form fields, and avoids external APIs.

## What is included

- `manifest.json`: Chrome Extension Manifest V3 configuration.
- `src/background.js`: Extension service worker and message relay.
- `src/content.js`: User-triggered page scanner for `input`, `textarea`, and `select` fields.
- `popup/popup.html`: Popup UI with scan and settings actions.
- `popup/popup.css`: Popup styling.
- `popup/popup.js`: Popup scan flow and result rendering.
- `options/options.html`: Profile settings page.
- `options/options.css`: Options page styling.
- `options/options.js`: Profile persistence with `chrome.storage.local`.

## Privacy model

- Profile data is saved only with `chrome.storage.local`.
- The extension does not call external APIs.
- The content script is injected only after the user selects **Scan Page**.
- Field scanning happens only on the active tab selected by the user.
- No autofill is performed yet.

## Manual setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project folder.
5. Pin or open the JobFill AI extension from the toolbar.

## Manual test steps

1. Open the extension details page and confirm there are no manifest errors.
2. Open **Profile Settings** from the popup.
3. Fill in profile fields such as full name, email, phone, LinkedIn, GitHub, portfolio, address, school, degree, and graduation year.
4. Select **Save Profile**.
5. Close and reopen the options page, then confirm the saved fields reload.
6. Select **Clear Profile**, then confirm fields are emptied and remain empty after reopening.
7. Visit a page with a form, such as a local test HTML page or a job application page.
8. Open the popup and select **Scan Page**.
9. Confirm the popup lists detected `input`, `textarea`, and `select` fields.
10. Try scanning a page where extensions cannot run, such as `chrome://extensions`, and confirm the popup shows an error instead of failing silently.

## Current limitations

- This version only detects fields; it does not autofill yet.
- Field matching is intentionally basic.
- No external AI or network calls are used.
