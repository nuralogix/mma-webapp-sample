# Changelog

All notable changes to this project are documented here.

---

## [1.4.0] — 2026-10-16 — Imperial/metric unit toggle on profile page

### Added
- Metric/Imperial toggle on the profile page, persisted across sessions
- Weight: lbs ↔ kg conversion with correct validation ranges (66–661 lbs / 30–300 kg)
- Height: ft + in dual inputs in imperial mode, single cm input in metric mode
- Values auto-convert when switching units; backend always receives metric (kg, cm)
- BMI validation always performed in metric after conversion

---

## [1.3.0] — 2026-10-15 — AGE_MMA backward compatibility

### Fixed
- Facial Skin Age now uses `AGE_MMA` signal when available, falls back to `AGE` for older backends
- `AGE_MMA` now decoded from NuraQR payloads (was silently dropped as it was not in the decoder's reverse map)

---

## [1.2.0] — 2026-10-15 — Rename AGE_CVM display name

### Changed
- AGE_CVM renamed from "Cardiovascular Metabolic Age" to "Physiological Age" in English and Chinese (`生理年龄`). Signal ID unchanged.

---

## [1.1.0] — 2026-08-11 — General wellness results view

### Added
- General Wellness Score dial card driven by `HEALTH_SCORE` signal
- Inline gauge bars on each metric row
- Info dialog overlay (ⓘ) per metric with descriptions from `data.js`
- QR code sharing — Share button encodes results as NuraQR v1 URL; standalone detection hides Exit/Try Again on phone-side view
- Public kiosk mode support (`WebResultScreen`) — Exit/Try Again/Share buttons show correctly in minimal WebView; bridge detection distinguishes full `AndroidBridge` from kiosk `WebResultBridge`
- Responsive body temperature layout for narrow screens (below 475 px)
- Info dialog height fix for kiosk WebView (`calc(100% - 2rem)` replaces unreliable `80vh`)

---

## [1.0.0] — 2026-05-15 — Initial release

- Initial project scaffold with `index.html`, `profile.html`, `result.html`, `config.js`, and supporting JS/assets.
