# JobFill AI

JobFill AI is a privacy-first Chrome Extension Manifest V3 project for helping with job application forms. This version stores a local profile, scans the active page for form fields, classifies obvious field types, previews high-confidence autofill targets, imports PDF resumes locally, and avoids external APIs.

## What is included

- `manifest.json`: Chrome Extension Manifest V3 configuration.
- `src/background.js`: Extension service worker and message relay.
- `src/content.js`: User-triggered page scanner, conservative field classifier, and guarded autofill handler for safe high-confidence fields.
- `popup/popup.html`: Popup UI with scan and settings actions.
- `popup/popup.css`: Popup styling.
- `popup/popup.js`: Popup scan flow and result rendering.
- `options/options.html`: Profile settings page.
- `options/options.css`: Options page styling.
- `options/options.js`: Profile persistence with `chrome.storage.local` and local PDF resume import.
- `src/fieldRules.js`: Shared classification and autofill safety rules.
- `tests/fieldRules.test.js`: Lightweight Node tests for classification and autofill safety.

## Privacy model

- Profile data is saved only with `chrome.storage.local`.
- The extension does not call external APIs.
- The content script is injected only after the user selects **Scan Page**.
- Field scanning happens only on the active tab selected by the user.
- Autofill happens only after the user selects **Autofill Page** in the popup.
- Autofill is limited to previewed high-confidence fields with saved local profile values.
- Field classification is local and rule-based.
- Resume PDF parsing runs locally in the options page. PDF bytes are not stored.
- Extracted resume values are previewed before applying, and profile storage is updated only after selecting **Save Profile**.
- Sensitive fields such as passwords, SSN/SIN, government IDs, payment information, salary expectations, legal authorization, and demographic questions are blocked.

## Manual setup

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project folder.
5. Pin or open the JobFill AI extension from the toolbar.

## Automated tests

Run the local test suite with:

```bash
npm test
```

The tests cover conservative field classification and autofill safety blocking for sensitive fields.

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
10. Confirm obvious fields show conservative guessed categories such as `fullName`, `email`, `phone`, `linkedin`, `github`, `portfolio`, `address`, `school`, `degree`, or `graduationYear`.
11. Confirm unclear fields show `unknown`.
12. Confirm the popup shows preview rows only for saved profile values in allowed autofill categories: `fullName`, `email`, `phone`, `linkedin`, `github`, `portfolio`, `school`, `degree`, and `graduationYear`.
13. Uncheck one preview row and confirm **Autofill Page** fills only the rows that remain checked.
14. Uncheck all preview rows and confirm autofill is disabled or blocked.
15. Confirm `address` is detected but not previewed for autofill.
16. Confirm scanning alone does not modify any page fields.
17. Select **Autofill Page** and confirm only checked previewed empty fields are filled.
18. Confirm passwords, SSN/SIN, government IDs, payment information, salary expectations, legal authorization, and demographic fields are not filled.
19. Open **Profile Settings**, choose a text-based PDF resume, and confirm extracted values appear in the preview before anything is saved.
20. Select **Apply to Profile Form** and confirm the extracted values appear in the form.
21. If existing form values would be changed, confirm the overwrite prompt appears.
22. Select **Save Profile**, close and reopen settings, then confirm applied values persist.
23. Try an image-only or complex PDF and confirm the extension reports missing readable text or shows limited extraction without sending data anywhere.
24. Try scanning a page where extensions cannot run, such as `chrome://extensions`, and confirm the popup shows an error instead of failing silently.

## Remaining manual verification

- Confirm behavior on real job application pages with custom or React-controlled inputs.
- Confirm duplicate fields, such as email confirmation fields, behave as expected.
- Confirm pages with iframes are handled acceptably, since cross-origin iframe fields are not reachable.
- Confirm conservative classifier misses are acceptable before expanding any matching rules.
- Confirm resume parsing accuracy across common resume PDF generators.

## Current limitations

- This version autofills only a small set of high-confidence profile fields.
- Field matching is intentionally conservative and may leave valid fields as `unknown`.
- Address fields are intentionally excluded from autofill for now.
- Resume import supports text-based PDFs best; scanned/image-only PDFs may not parse.
- Extracted education and experience are previewed, but only existing profile fields are saved.
- No external AI or network calls are used.
