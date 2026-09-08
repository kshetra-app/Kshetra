# RELEASE REGISTER: PANIN / KSHETRA
**Last Updated:** 2026-09-08
**Standard:** AI Agent Master Execution Job Book (Section 0.8, Part 18, Part 20)

---

## Production & Staging Releases

| Release Tag | Target Env | Target Binary | Measured Size (AAB/APK) | JS Bundle Size | API Version | Git Commit | Release Gate Status | Verified By |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `v0.1.0-audit` | Dev Baseline | Android Universal | Pending measurement (W001) | TBD | v1 | `0f7e104` | Baseline Audit | ARCH / DEVOPS |

---

### Release Size & Performance Gates
- **Max Consumer AAB:** 30 MB (Target: ≤ 25 MB)
- **Max Universal APK:** 45 MB
- **Cold App Startup:** < 2.0s
- **Warm App Startup:** < 500ms
- **API Health Gate:** `GET /health` == `200 OK`
- **13-Language i18n Gate:** 100% string coverage across `en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, `ne` with 0 missing keys and 0 visual text overflow/clipping bugs in release builds.
