# NuraLogix mma-webapp-sample

A sample WebView frontend designed to run inside the MMA App.

---

## Overview

This demo shows how web pages interact with the MMA device through a JavaScript bridge. It is intended as a starting point for developers who want to customise the web UI.

There are **two ways** to use this project:

| Mode | Pages used | Use case |
|---|---|---|
| **Full WebView Flow** | `index.html` → `profile.html` → Scan (Native App) → `result.html` | Complete pre-scan and post-scan experience |
| **Results page only** | Native App → `result.html` | Use when you only need to customise the results screen. Covers two scenarios: (1) **On MMA WebView results** — native app handles the full scan flow and passes results directly to `result.html` within WebView; (2) **Results sharing through QR code** — results are encoded into a QR code URL which the user scans to open `result.html` in a browser on their own device. |

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home / landing page — displays the logo centered on screen with Continue and Sample Results buttons |
| `profile.html` | User profile form — collects and validates [User Profile and Medical History Questionnaire]('https://docs.deepaffex.ai/guide/demographics.html') before a scan, can also be used to tag an ID to the scan using the Partner ID field |
| `result.html` | Results page — renders all DeepAffex™ measurement outputs |

---

## Project Structure

```
mma-webapp-sample/
├── index.html
├── profile.html
├── result.html
├── config.js                  # Runtime configuration (QR, excluded points)
├── js/
│   ├── common.js              # Handles inbound navigation requests from the MMA platform
│   ├── data.js                # Point definitions, scale segments, and translations
│   ├── results-app.js         # Renders the results page
│   ├── svg-icons.js           # Inline SVG icons for all measurement points
│   ├── point-info-dialog.js   # Info overlay dialog for each metric
│   └── vendor/
│       └── float16.min.js     # Float16 decoder (used by QR result decoding)
└── assets/
    └── imgs/
        └── warning32.png      # Disclaimer icon
```

---

## Configuration (`config.js`)

All runtime options are set in `config.js` via the `APP_CONFIG` object.

```js
var APP_CONFIG = {
    // Point IDs to hide from the results page entirely.
    excludePoints: [
        "HEIGHT",
        "WEIGHT",
        "WAIST_CIRCUM"
    ],
    qrCodeResults: {
        // Set to true to show a Share button on the results screen that generates a QR code.
        enabled: true,
        // URL base for the QR code. The encoded results (?r=) and measurement ID (?mid=)
        // are appended automatically. Pages opened via QR code are automatically detected
        // as standalone (no Exit/Try Again buttons) because the ?r= param is present.
        // Leave empty to use the current page's own URL.
        url: "https://your-hosted-result-page.example.com/result.html"
    }
};
```

### `excludePoints`

A list of DeepAffex™ point IDs to suppress from the results view. Any point ID listed here will be skipped during rendering even if the measurement returned a value for it. Use this to tailor the results to your deployment.

### `qrCodeResults`

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | When `true`, a **Share** button appears on the results screen. Tapping it generates a QR code the user can scan on their phone to view their results. |
| `url` | `string` | The base URL of the hosted results page to encode into the QR code. Leave empty (`""`) to use the current page's URL |

> **Standalone detection:** When a results page is opened via a QR code URL, the `?r=` parameter is present. The page uses this automatically to hide the Exit and Try Again buttons, which are only relevant on the MMA device itself.

---

## Getting Started

No build step or package manager is required — this is a plain static web application.

```bash
# Serve locally with any static file server
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> **Note:** Any call that requires the MMA bridge (navigation to the measurement screen, language switching, device ID) will fall back gracefully when running in a browser.

### Quick preview with sample results (native flow)

On the home page, click **Sample Results** to load a pre-populated results page instantly — no MMA device connection required. This simulates the native bridge flow: Exit and Try Again buttons are shown, exactly as they would be on an MMA device.

### Testing the URL-based (QR) results flow

To test the standalone QR flow in a browser, load a result URL with the `?r=` query parameter directly. In this mode, Exit and Try Again buttons are hidden, matching what a user sees after scanning a QR code.

Example:

```
http://localhost:8080/result.html?r=TlExkyFmm6Qab1X0k6xTSQrGR9i5lkRgCn9SXMJ8VSbzADyYt3JBJmBEVHlaAEL4agdUcZJ1Q2Op%2Fjb4wABJHNF9Qh0OQETKAwBCSxjmUGuVhFQ1jCZI9s7RV8MiklBOPZpQSCxLTfITZ06U6YBOv6deTVGFkVTxTVpJGydASSfTVUOwKjYoU%2BpIWa6RU0ITZms209dATxW%2B5ERAzNBDSqa8T00KAABsnrZAQLAlRP8MklDYTwBCn6gATYQoWT5F6KI%2BBenpPsQpED%2BF61I%2FRCtvPwQqnj%2FF6v8%2Fhe4ZQEQuTEAp57xA6CfzQagmJUJp5oZCKCRIROnkl0Wp5axFaCXBRSgh1kXp4etF&mid=806e1a9d-3dd8-4847-b64d-3bce3043535e
```

The `?r=` value is a binary-encoded payload (the same format used in QR code sharing). The page decodes it, seeds `sessionStorage`, and renders the results.

---

## User Flows

### Mode 1 — Full WebView Flow

```
index.html ──(Continue)──► profile.html ──(Next / Skip Profile)──► [MMA Measurement]
                                                                              │
                                                                   Native scan completes
                                                                              │
                                                                              ▼
                                                                       result.html
                                                                    (Exit / Try Again)
```

### Mode 2 — Results page only

```
[MMA Measurement] ──► result.html
                   (Exit / Try Again shown)
```

In this mode, the pre-scan pages (`index.html`, `profile.html`) are not used.

### QR code sharing

```
result.html ──(Share button)──► QR code overlay
                                       │
                              User scans with phone
                                       │
                                       ▼
                              result.html?r=<payload>
                              (standalone — no Exit/Try Again)
```

---

## MMA ↔ JavaScript Bridge

The web app and the MMA platform communicate through a bidirectional bridge. This section documents the **JavaScript side** of that contract so you know what to expect when customising the web pages.

```
MMA Platform (native)                       WebApp (JavaScript)
────────────────────────────────────────────────────────────────
NativeBridge.onJSRequest(json)  ◄────────  JS calls native
evaluateJavascript(…)           ─────────► Native calls JS
```

---

### JS → Native

All outbound calls use the single entry point:

```js
AndroidBridge.onJSRequest(requestJson: String): String?
```

`requestJson` is a JSON-serialised `JSRequest`:

```json
{ "type": "<action>", "data": "<optional JSON string>" }
```

#### Call reference

| Function | File | `type` | `data` payload | Returns |
| --- | --- | --- | --- | --- |
| `navigateToMeasurement()` | `index.html` | `navigate` | `{ destination: "measurement", params: {} }` | — |
| `navigateToSettings()` | `index.html` | `navigate` | `{ destination: "agent/login", params: {} }` | — |
| `getDeviceID()` | `index.html` | `getDeviceID` | `null` | Device ID string |
| `getCurrentLanguageCode()` | `index.html` | `getCurrentLanguageCode` | `null` | Locale code e.g. `"en"` |
| `handleLanguageSelection(code)` | `index.html` | `switchLanguage` | `"en"` \| `"zh"` | — |
| `submitProfile()` | `profile.html` | `navigate` | `{ destination: "measurement", params: { …profileData } }` | — |
| `skipProfile()` | `profile.html` | `navigate` | `{ destination: "measurement", params: {} }` | — |
| `backToHome()` | `result.html` | `navigate` | `{ destination: "index", params: {} }` | — |

#### Profile data shape

When the user submits the profile form, the following object is passed as `params`:

```json
{
  "age": "30",
  "weight": "70",
  "height": "175",
  "sex": "male",
  "smoking": "1",
  "diabetes": "type2",
  "bloodpressuremedication": "0",
  "partnerID": "abcd"
}
```

| Field | Key | Type | Valid values |
| --- | --- | --- | --- |
| Age | `"age"` | string | `"18"` – `"120"` (years) |
| Sex assigned at birth | `"sex"` | string | `"male"` / `"female"` |
| Height | `"height"` | string | `"120"` – `"220"` (cm) |
| Weight | `"weight"` | string | `"30"` – `"300"` (kg) |
| Smoker | `"smoking"` | string | `"1"` (yes) / `"0"` (no) |
| Diabetic | `"diabetes"` | string | `"type1"` / `"type2"` / `"0"` (none) |
| Blood pressure medication | `"bloodpressuremedication"` | string | `"1"` (yes) / `"0"` (no) |
| Partner ID | `"partnerID"` | string | 2–148 characters (optional — omitted if blank) |

> **Important:** All values must be strings. Boolean-like fields use `"1"` / `"0"` strings, not JavaScript booleans.

---

### Native → JS

The MMA platform calls JavaScript by evaluating a function in the WebView.

| Function | File | When the MMA platform calls it |
|---|---|---|
| `onNativeRequest(requestJson)` | `js/common.js` | To trigger navigation or pass data across page loads |
| `setMeasurementResults(paramsJson)` | `result.html` | After a measurement completes — delivers the full result payload |

#### `onNativeRequest` — navigate type

```json
{ "type": "navigate", "data": "{\"destination\": \"results\", \"paramsJson\": \"…\"}" }
```

| `destination` | Effect |
|---|---|
| `"index"` | Navigates to `index.html` |
| `"profile"` | Navigates to `profile.html` |
| `"results"` | Seeds `sessionStorage` with `paramsJson` and navigates to `result.html` |

#### `setMeasurementResults` — payload shape

```json
{
  "timestamp": 1741900000000,
  "SNR": 14.5,
  "STAR_RATING": 4,
  "HR_BPM": 72,
  "IHB_COUNT": 0,
  "BR_BPM": 16,
  "BP_SYSTOLIC": 118,
  "BP_DIASTOLIC": 76,
  "TEMPERATURE_SENSOR": 36.6,
  "HRV_SDNN": 42,
  "BP_RPP": 4.1,
  "BP_TAU": 1.2,
  "MSI": 1.2,
  "BMI_CALC": 23.1,
  "AGE": 35,
  "WAIST_TO_HEIGHT": 0.46,
  "ABSI": 0.071,
  "BP_CVD": 0.03,
  "BP_HEART_ATTACK": 0.02,
  "BP_STROKE": 0.01,
  "HPT_RISK_PROB": 0.09,
  "...": "..."
}
```

All keys are plain strings (e.g. `"HR_BPM"`). The `timestamp` field is a Unix millisecond epoch.

---

## Customisation Notes

- **Styling** — Each page has its own `<style>` block. Brand colours used throughout: `#F65F77` (pink accent), `#005DBC` (blue).
- **Excluding metrics** — Add point IDs to `excludePoints` in `config.js` to hide them from the results view without touching `data.js`.
- **Adding / reordering metrics** — Edit the `sections` array in `js/data.js` to control which points appear and in which section.
- **Point definitions** — Scale segments, colour thresholds, units, and decimal places are all in `js/data.js` under `pointDefinitions`.
- **Translations** — All display strings (titles, units, descriptions) are in the `translations` object in `js/data.js`.
- **Icons** — All metric icons are inlined as SVG strings in `js/svg-icons.js`, keyed by point ID.
- **Info dialogs** — `js/point-info-dialog.js` controls the overlay that appears when a user taps the ⓘ icon next to a metric.

---

## Adding a New Language

> **Important — native scan support required:** The web pages cover only the pre-scan and results UI. The native scan screen (camera, measurement progress, etc.) is a separate component with its own language config and translations. Adding a language to the web side alone will not translate the native scan experience. To have a new language enabled and translated in the native scan, **contact NuraLogix support**.

Strings are split across two locations: the **page-level translations** (UI chrome) and the **data-level translations** (metric names, units, and descriptions). Both must be updated.

### 1. Page-level strings

Each HTML file has its own translations object. Add an entry for your new locale code (e.g. `"fr"` for French) to each one.

**`index.html`** — `languages` object:

```js
const languages = {
    'en': { 'profile-button': 'Continue', 'sample-results-button': 'Sample Results' },
    'zh': { 'profile-button': '继续',     'sample-results-button': '样本结果' },
    'fr': { 'profile-button': 'Continuer', 'sample-results-button': 'Résultats exemples' }
    //       ^^^ add your locale here
};
```

Also add a `<button>` for it in the language menu:

```html
<div class="language-menu" id="language-menu">
    <button class="language-option" onclick="handleLanguageSelection('zh')">中文</button>
    <button class="language-option" onclick="handleLanguageSelection('en')">English</button>
    <button class="language-option" onclick="handleLanguageSelection('fr')">Français</button>
</div>
```

**`profile.html`** — `profileTranslations` object:

```js
const profileTranslations = {
    en: { title: 'User Profile', btn_next: 'Next', /* … */ },
    zh: { title: '用户信息',     btn_next: '下一步', /* … */ },
    fr: { title: 'Profil',      btn_next: 'Suivant', /* … all keys … */ }
};
```

**`result.html`** — `resultTranslations` object:

```js
const resultTranslations = {
    en: { title: 'Measurement Results', btn_back: '← Back', btn_home: 'Back to Home', loading: 'Loading measurement results...' },
    zh: { title: '测量结果',            btn_back: '← 返回', btn_home: '返回主页',      loading: '正在加载测量结果...' },
    fr: { title: 'Résultats',           btn_back: '← Retour', btn_home: 'Accueil',    loading: 'Chargement des résultats...' }
};
```

### 2. Data-level strings (`js/data.js`)

All metric titles, units, and info-dialog descriptions live in the `translations` object inside `data.js`. Each entry looks like:

```js
"DFXPOINT_TITLE:HR_BPM": {
    "default": "Heart Rate",
    "zh":      "心率"
}
```

To add French, append your locale to every entry that needs it:

```js
"DFXPOINT_TITLE:HR_BPM": {
    "default": "Heart Rate",
    "zh":      "心率",
    "fr":      "Fréquence cardiaque"
}
```

If a key is missing your locale, `results-app.js` falls back to `"default"`, so you can add translations incrementally.

### 3. Locale code conventions

The locale code passed around (`"en"`, `"zh"`, `"fr"`) must be consistent across:
- `localStorage.setItem('selectedLanguage', code)` (persists the user's choice)
- The keys in all three translations objects above
- The `data.js` translation entries
- The `AndroidBridge.onJSRequest({ type: "switchLanguage", data: code })` call (notifies the native app)

---

© 2026 NuraLogix Corporation. All rights reserved.
