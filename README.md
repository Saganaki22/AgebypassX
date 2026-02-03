# 🛡️ AgebypassX – v2.2.0 (Updated 02.02.2026)
Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — quietly and locally.

---

## 🚀 Quick Setup Guide (Recommended) 
1. Install **Tampermonkey** (if not already installed).  
2. Install the **AgebypassX** userscript.  
3. Reopen X/Twitter — the **green indicator dot** should appear if everything is set up correctly. ✅  


---

## 🔒 Privacy
- **Runs locally** in your browser; **no data is sent** anywhere.
- Does **not** modify your account, cookies, or perform any tracking.

Your privacy remains intact. 🛡️

---

## 📸 How It Works
AgebypassX applies a minimal, privacy-focused set of patches directly in the page context:

- **Intercepts assignments to** `window.__INITIAL_STATE__` using a setter and **patches the object** as it is stored.
- **Overrides `JSON.parse`** so parsed GraphQL/JSON payloads are patched before site code consumes them.
- **Recursively walks state objects** and updates known flags and values (see list below).
- **Spoofs birthdate** fields found in state to an adult year (1990-01-01) to prevent age gating.

Patched flags (when present):
- `rweb_age_assurance_flow_enabled` → false
- `age_verification_gate_enabled` → false
- `sensitive_tweet_warnings_enabled` → false
- `sensitive_media_settings_enabled` → true
- `grok_settings_age_restriction_enabled` → false
- `rweb_mvr_blurred_media_interstitial_enabled` → false

If a flag is stored as an object with a `value` property, the script updates that `value` instead of overwriting the object.

---

## ✅ Verify the Script
Open developer tools (Console) on X/Twitter and run a quick check:

```javascript
// Example: JSON.parse interception should patch the object
const test = JSON.parse('{"sensitive_media_settings_enabled": false, "birthdate": {"year": 2008, "month": 1, "day": 1}}');
console.log(test);
// Expect: test.sensitive_media_settings_enabled === true
// Expect: test.birthdate.year === 1990

// Or inspect the initial state (if present)
console.log(window.__INITIAL_STATE__);
```

---

## 🛠️ Troubleshooting
- Make sure **Tampermonkey is enabled** and the script is **active**.
- Script runs at `document-start`; **reload the page** to ensure it runs before X's scripts execute.
- If behavior changes or patches stop applying, X/Twitter may have changed internal keys or structure — please open an issue with relevant console output and browser details.

---

## 🧑‍💻 Source & Issues
Open-source and auditable:  
🔗 https://github.com/Saganaki22/AgebypassX

Report issues at: https://github.com/Saganaki22/AgebypassX/issues

---

## 📜 License
Licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

## 🔄 Version Highlights

### v2.2.0 - 02.02.2026
- **JSON.parse interception** to sanitize incoming JSON/GraphQL payloads.
- **Recursive `__INITIAL_STATE__` patching** to remove age gates and enable sensitive media.
- **Birthdate spoofing** to ensure an adult age is present in patched state.
- **Minimal, privacy-first implementation** with no telemetry or UI injection.

---

*If you need additional features (UI, debugging API, or more flexible configuration), please open an issue or contribute via a PR.*
