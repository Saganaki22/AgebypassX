# 🛡️ AgebypassX v2.4.1

A lightweight Tampermonkey userscript designed to modify X/Twitter's client-side age and sensitive-media feature state directly in the browser.

## What's improved in 2.4.1

This release focuses on reliability. It replaces recursive traversal with an iterative walk, keeps support for class-based and custom-prototype state, recognizes GraphQL feature entries in fetch responses, and restores the indicator and stylesheet after page changes.

The same 29 simulated-browser tests passed **29/29 on 2.4.1**, compared with **20/29 on 2.4.0**. The suite includes a 20,000-level object graph and DOM replacement scenarios. These results demonstrate fixes for the tested cases; they do not establish faster scrolling or lower CPU usage on X. No before/after performance benchmark has been performed.

A user-reported live check also confirmed working behavior with ACTIVE status, successful flag writes and no reported script errors. This is a functional smoke check, not a controlled comparison across browsers, accounts or regions. See [the test report](TEST-RESULTS.md) for the environment, coverage and remaining limits.

---

AgebypassX v2.4.1 uses a **multi-layer state interception system** covering:

- `window.__INITIAL_STATE__`
- `Object.assign`
- `JSON.parse`
- `Response.prototype.json`

The script runs entirely inside your browser. It does not send data to external servers, include analytics or tracking, or directly modify your X/Twitter account.

> **Note:** Current versions do **not** use webpack chunk interception. Modern AgebypassX releases work by intercepting and patching application state and parsed response data before X's frontend consumes it.

---

## 🚀 Installation

### Recommended Setup

1. Install **Tampermonkey** or another compatible userscript manager.
2. Install the **AgebypassX** userscript.
3. Open or reload **X/Twitter**.
4. A small **green status dot** should appear in the upper-right corner.

The script runs at:

```text
document-start
```

so its hooks are installed as early as possible.

---

## 🔒 Privacy

AgebypassX is designed to operate entirely locally.

The script:

- Does **not** send browsing data anywhere.
- Does **not** contact external APIs or servers.
- Does **not** contain analytics.
- Does **not** contain advertisements.
- Does **not** contain telemetry or tracking.
- Does **not** directly modify your X/Twitter account.
- Does **not** modify authentication cookies.
- Stores only the indicator visibility preference locally using `localStorage`.

Everything happens inside the browser through the userscript.

The full source code is available for inspection.

---

## ⚙️ How It Works

Modern X/Twitter pages receive application configuration and feature information through several different state and response paths.

AgebypassX hooks those paths and patches selected client-side values before the frontend uses them.

### Targeted Feature Flags

The current version watches for:

```js
rweb_age_assurance_flow_enabled
age_verification_gate_enabled
sensitive_tweet_warnings_enabled
sensitive_media_settings_enabled
grok_settings_age_restriction_enabled
rweb_mvr_blurred_media_interstitial_enabled
```

The current desired values are:

```js
{
    rweb_age_assurance_flow_enabled: false,
    age_verification_gate_enabled: false,
    sensitive_tweet_warnings_enabled: false,
    sensitive_media_settings_enabled: true,
    grok_settings_age_restriction_enabled: false,
    rweb_mvr_blurred_media_interstitial_enabled: false
}
```

AgebypassX supports multiple feature-state shapes.

Direct properties:

```js
{
    sensitive_media_settings_enabled: true
}
```

Wrapped values:

```js
{
    sensitive_media_settings_enabled: {
        value: true
    }
}
```

GraphQL-style feature entries:

```js
{
    feature: "sensitive_media_settings_enabled",
    enabled: true
}
```

The patcher searches relevant state objects with an iterative depth-first walk and a per-patch `WeakSet`. Deep state does not consume the JavaScript call stack, and circular references are visited only once per patch. There is no arbitrary nesting-depth cutoff on a full patch.

---

## 🔢 Type-Preserving Feature Writes

X may represent feature-switch values using different types.

For example, a value may appear as:

```js
true
```

or:

```js
"true"
```

or occasionally:

```js
1
```

AgebypassX v2.4.1 preserves the original representation when applying the desired boolean state.

Examples:

```text
boolean → boolean
string  → "true" / "false"
number  → 1 / 0
```

This avoids breaking frontend code which performs strict comparisons against the original value type.

---

## ✅ Verified Writes

Feature writes are verified instead of assuming that assignment succeeded.

Target-feature modifications use a verified write process:

```text
Read current value
        ↓
Determine correctly typed desired value
        ↓
Attempt assignment
        ↓
Read value back
        ↓
Verify that the new value actually stuck
```

This catches cases such as:

- Frozen objects.
- Non-writable properties.
- Throwing setters.
- Setters which accept a value but silently discard it.
- Unexpected application-state behaviour.

Successful writes are recorded separately from failed writes in the diagnostics.

---

## 🎂 Birthdate Handling

AgebypassX also patches compatible client-side `birthdate` objects to an adult date:

```js
{
    year: 1990,
    month: 1,
    day: 1
}
```

Birthdate writes are:

- Type-preserving.
- Verified after assignment.
- Independently counted in diagnostics.

Existing numeric values remain numbers:

```text
1995 → 1990
```

Existing string values remain strings:

```text
"1995" → "1990"
```

Missing birthdate fields are filled using numeric values.

---

## 🧩 Interception Layers

### 1. `__INITIAL_STATE__`

AgebypassX installs an accessor on:

```js
window.__INITIAL_STATE__
```

When X assigns its initial application state, the object is patched before the frontend consumes it.

### Late-Injection Protection

Although the script runs at `document-start`, userscript injection timing can occasionally vary.

AgebypassX therefore checks whether:

```js
window.__INITIAL_STATE__
```

already exists before installing the hook.

If an existing state object is found:

1. Its current value is preserved.
2. The existing object is patched.
3. The accessor is installed using that preserved value.

This avoids replacing already-populated application state with `undefined`.

If reading an existing `__INITIAL_STATE__` property itself throws, AgebypassX **does not replace it**.

Instead, Hook 1 is left untouched and the remaining interception layers continue operating.

---

### 2. `Object.assign`

Some application state is created or updated dynamically after initial page load.

AgebypassX wraps:

```js
Object.assign
```

and checks state-like targets containing structures such as:

```text
featureSwitch
entities
users
```

Relevant objects are patched after the native assignment completes. Class instances, arrays, custom prototypes, null-prototype objects and objects from other realms remain supported; the hook does not restrict state to plain objects.

---

### 3. `JSON.parse`

Some application state is created from JSON strings.

AgebypassX wraps:

```js
JSON.parse
```

Before walking the parsed object, the original JSON text is checked using a single regular-expression gate.

The gate looks for:

- Known target feature names.
- `birthdate`
- `featureSwitch`

If nothing relevant is present, the object is returned without a deep traversal.

---

### 4. `Response.prototype.json`

Modern X code frequently uses:

```js
fetch(...)
```

followed by:

```js
response.json()
```

Browser-native `Response.json()` parsing can bypass an overridden page-level `JSON.parse`.

AgebypassX therefore also wraps:

```js
Response.prototype.json
```

Returned objects are inspected using a lightweight structural scan before the full patcher runs.

The current structural pre-scan depth is:

```text
5
```

A full patch only occurs when potentially relevant state is detected, including GraphQL entries whose known flag name appears in `feature` and whose value appears in `enabled`. Prototype names such as `constructor` and `toString` do not count as known flags.

The depth-five limit applies only to the structural pre-scan. A response whose only relevant marker lies deeper than that can still be skipped. Once a gate matches, the full patch has no depth cutoff.

---

## ⚡ Performance

AgebypassX is designed to avoid blindly scanning everything X creates.

Version 2.4.1 improves traversal robustness, but no real-world speed improvement has been measured. Hook counters show how often patching is attempted, not how much CPU time it takes.

### Raw JSON Gate

Before walking data returned through `JSON.parse`, the script performs a single regex search for:

- Target feature names.
- `birthdate`
- `featureSwitch`

If none are present, no full patch is performed.

### Fetch Response Gate

Objects returned through `Response.json()` use a depth-limited structural scan before the full patcher runs.

### Event-Driven Architecture

AgebypassX does **not** use:

- Continuous polling.
- Scroll listeners.
- Repeating patch timers.
- Per-tweet processing loops.
- Webpack module rewriting.

Patching occurs only when one of the hooked data paths is triggered.

---

## 🔁 SPA Navigation Support

X is a Single Page Application.

Large parts of the application can change without a traditional page reload.

AgebypassX creates a new:

```js
WeakSet
```

for every patch operation.

This gives cycle protection during one traversal while still allowing the same state object to be patched again later if X repopulates or modifies it.

---

## 🎭 Native Function Compatibility

AgebypassX wraps several native JavaScript functions.

To reduce compatibility problems, replacement functions preserve the original function's:

```text
.name
.length
```

For example:

```js
JSON.parse.name
```

continues to behave like:

```text
parse
```

and:

```js
Object.assign.name
```

continues to behave like:

```text
assign
```

AgebypassX intentionally does not currently add more aggressive anti-detection or `Function.prototype.toString` spoofing.

There is no evidence that this is required for current functionality, and avoiding unnecessary interception keeps the implementation simpler and more maintainable.

---

## 🟢 Status Indicator

AgebypassX displays a small status indicator in the top-right corner.

### Green Dot

🟢 **ACTIVE**

The current interception and traversal system is operating without a detected traversal/hook error.

A successful later gated patch can restore the indicator to green after a transient error.

### Red Dot

🔴 **ERROR**

A hook installation or object traversal operation encountered an error.

Check the browser console for messages beginning with:

```text
[Nox]
```

### Important

The dot represents **hook/traversal health**.

Individual feature writes which fail or do not stick are tracked separately in diagnostics and do not automatically turn the dot red.

This distinction allows the script to report:

```text
Hooks operational
```

while separately showing:

```text
Specific feature write failed
```

---

## 📊 Diagnostics

Click the green/red indicator dot to print AgebypassX diagnostics to the browser console.

The diagnostics include:

```text
Current ACTIVE / ERROR status
Total historical hook/traversal errors
Gate-hit counters
Feature flags found
Feature flags successfully changed
Feature processing/write failures
Birthdate statistics
Potential related/unknown keys
Recent errors
```

### Gate Counters

AgebypassX tracks how many relevant patch attempts came from:

```text
state
assign
parse
json
```

These correspond to:

```text
__INITIAL_STATE__
Object.assign
JSON.parse
Response.json
```

This helps identify which interception paths are actually being used by the current X frontend.

---

## 🎯 Feature Diagnostics

Three counters are tracked for every known target flag.

### `found`

How many times the feature was encountered.

### `changed`

How many times its value needed changing and the new value was successfully verified after assignment.

### `writeFailed`

How many times the feature could not be completely processed or written.

This can include:

- Property reads which throw.
- Assignment failures.
- Non-writable properties.
- Read-back mismatches.
- Setters which discard the requested value.

### Reading the Counters

```text
found > 0
changed > 0
writeFailed = 0
```

Means:

```text
Working normally.
```

---

```text
found > 0
changed = 0
writeFailed = 0
```

Means:

```text
The flag was found but already had the desired value.
```

---

```text
found > 0
writeFailed > 0
```

Means:

```text
The flag exists, but one or more processing/write attempts did not complete successfully.
```

---

```text
found = 0
```

Means:

```text
The flag was not encountered during this session.
```

This is a **warning signal, not proof of removal**.

Possible explanations include:

- X renamed the feature.
- The feature is region-specific.
- The account is not part of the relevant experiment.
- The endpoint containing the feature was never loaded.
- X removed the feature.
- X moved the configuration elsewhere.

---

## 🎂 Birthdate Diagnostics

Birthdate handling has its own counters:

```text
seen
changed
failed
```

### `seen`

Number of compatible birthdate objects encountered.

### `changed`

Number of individual birthdate fields successfully changed and verified.

### `failed`

Number of individual birthdate field writes which threw or failed read-back verification.

---

## 🔎 Related-Flag Discovery

AgebypassX also includes a lightweight diagnostic scanner which looks for potentially related keys containing terms such as:

```text
age
birth
minor
sensitive
blur
restrict
verif
interstitial
```

Potential matches are logged once per session.

These keys are displayed as:

```text
related keys seen near known structures (NOT verified flags)
```

### Limitation

This is **not** a complete automatic feature-renaming detector.

The scanner only runs while traversing state that was already reached through one of AgebypassX's known gates.

If X completely renames both a feature and the surrounding structure, the scanner may never encounter it.

The `found = 0` counters remain an important signal when investigating possible frontend changes.

---

## 🖱️ Diagnostics Example

Click the status dot and open DevTools Console.

You may see something similar to:

```text
[Nox] diagnostics v2.4.1

status: ACTIVE | total errors: 0

gate hits:
{
    state: 1,
    assign: 4,
    parse: 2,
    json: 7
}

flags found:
{
    rweb_age_assurance_flow_enabled: 2,
    age_verification_gate_enabled: 0,
    sensitive_tweet_warnings_enabled: 3,
    sensitive_media_settings_enabled: 3,
    grok_settings_age_restriction_enabled: 1,
    rweb_mvr_blurred_media_interstitial_enabled: 0
}

flags changed:
{
    ...
}

flag process/write failures:
{
    ...
}

birthdate:
{
    seen: 2,
    changed: 3,
    failed: 0
}
```

Actual values depend on:

- Account configuration.
- Region.
- Experiments.
- Which X pages were visited.
- Which API responses were loaded.

---

## ⌨️ Indicator Hotkey

Press:

```text
Alt + .
```

to show or hide the indicator.

The preference is stored locally using:

```js
localStorage
```

and persists across page reloads.

No external server receives this setting.

---

## 🛡️ Defensive Indicator Mounting

Because the userscript runs at:

```text
document-start
```

the page DOM may not yet exist when execution begins.

Hooks install immediately. The indicator waits for `document.body`, mounts the dot inside the body, and places its stylesheet in the head when available.

A `MutationObserver` watches direct children of the document, root, head and body. It restores a removed dot or stylesheet and reattaches to replacement containers during page updates. It does not observe every descendant mutation in the timeline, and no polling timer is required.

---

## 🛠️ Troubleshooting

### No Indicator Appears

Try:

- Press **Alt + .** in case the indicator was previously hidden.
- Confirm Tampermonkey is enabled.
- Confirm AgebypassX is enabled.
- Confirm the script has permission to run on:

```text
https://x.com/*
https://twitter.com/*
```

- Reload the page.

---

### No `[Nox]` Messages in Console

Open DevTools:

```text
F12 → Console
```

Search for:

```text
[Nox]
```

You should normally see messages similar to:

```text
[Nox] v2.4.1 loaded
[Nox] ready — click the dot for diagnostics
```

If there are no AgebypassX messages at all, the userscript may not be executing.

Check the userscript manager and site permissions.

---

### Red Indicator

A red indicator means the hook/traversal system encountered an error.

Possible console messages include:

```text
[Nox] Existing state capture failed
[Nox] __INITIAL_STATE__ hook failed
[Nox] State patch failed
[Nox] Object.assign patch failed
[Nox] JSON.parse patch failed
[Nox] Response.json hook failed
[Nox] walk failed
```

Click the dot to print the full recent-error diagnostics.

Include relevant messages when opening a bug report.

---

### Green Indicator but Behaviour Has Not Changed

A green indicator does **not** guarantee that every target flag still exists or that X still relies on client-side enforcement.

Click the indicator and inspect:

```text
flags found
flags changed
flag process/write failures
birthdate
gate hits
```

X may have:

- Renamed a feature flag.
- Changed its response format.
- Moved configuration to another state path.
- Region-gated a feature.
- Added or changed experiments.
- Added server-side enforcement.
- Changed how the frontend consumes feature state.

The diagnostic counters are designed to make these cases easier to identify.

---

## 🌐 Browser Compatibility

AgebypassX has primarily been tested with Chromium-based browsers.

Examples include:

- Google Chrome
- Chromium
- Microsoft Edge
- Brave

Tampermonkey and Violentmonkey-compatible environments should generally work, but userscript-manager behaviour can differ between browsers.

The script safely guards its use of:

```js
GM_info
```

and falls back to the hardcoded script version if unavailable.

---

## 🧪 Simulated Browser Tests

Development requires Node.js 20.19+, 22.13+, or 24+ within the supported major-version ranges in `package.json`.

```sh
npm ci --ignore-scripts
npm run check
npm test
```

The suite executes the complete userscript in isolated jsdom windows and tests its public hooks, DOM and click-to-print diagnostics. A per-window subclass of Node's native `Response` supplies real JSON parsing and body-consumption behavior because jsdom does not implement fetch.

Coverage includes 20,000-level state, cycles, shared references, typed flag and birthdate writes, custom-prototype targets, throwing/frozen objects, parsing errors, response feature arrays, status recovery, document-start, indicator/style restoration, container replacement and the visibility hotkey. A timeline simulation verifies that 1,000 nested DOM insertions do not trigger the indicator observer.

These tests do not establish live X compatibility, visual rendering, userscript-manager injection behavior or any performance improvement on a real timeline. The userscript itself has no npm/runtime dependency; jsdom is used only for development tests.

---

## 🧪 Debugging

Open DevTools and filter for:

```text
[Nox]
```

### Script Startup

```text
[Nox] v2.4.1 loaded
```

The userscript has started executing.

```text
[Nox] ready — click the dot for diagnostics
```

Hook installation code has completed.

### Errors

Errors use messages such as:

```text
[Nox] JSON.parse patch failed
```

The diagnostics retain up to the most recent:

```text
20
```

errors.

Console warning output is rate-limited to avoid excessive spam.

---

## 🐛 Reporting Issues

Bug reports are welcome.

Open an issue:

https://github.com/Saganaki22/AgebypassX/issues

Please include:

- Browser name.
- Browser version.
- Userscript manager.
- Userscript manager version.
- AgebypassX version.
- Current dot status.
- `gate hits` diagnostics.
- `flags found` diagnostics.
- `flags changed` diagnostics.
- `flag process/write failures`.
- Birthdate diagnostics if relevant.
- Related-key diagnostics if present.
- Relevant `[Nox]` errors.
- Description of what happened.
- Steps required to reproduce the issue.

Please remove personal information from screenshots or console output before posting it publicly.

---

## 🧑‍💻 Source Code

AgebypassX is open source.

Repository:

https://github.com/Saganaki22/AgebypassX

The complete userscript can be inspected before installation.

---

## 📜 License

AgebypassX is licensed under the **MIT License**.

You are free to inspect, modify, fork, and redistribute the project under the terms of the license.

https://opensource.org/licenses/MIT

---

## ⭐ Support & Contributions

Feedback, bug reports, pull requests, and improvements are welcome.

GitHub:

https://github.com/Saganaki22/AgebypassX

If X changes its frontend architecture or feature configuration, reports containing the diagnostic counters can help identify what changed.

---

# 🔄 Version History

## v2.4.1 — Current

- Replace recursive patch traversal with an iterative walk, retaining deep-state and cycle coverage.
- Preserve all existing state-object types handled by `Object.assign`.
- Recognize GraphQL feature-array entries in the fetch-response gate and use own-property checks for known flag names.
- Avoid repeatedly scanning shared/cyclic response branches while preserving shorter-path coverage.
- Mount the indicator only after the body exists; restore the dot and stylesheet after removal or container replacement.
- Add simulated-browser regression tests and keep native function compatibility limited to names and arities.

## v2.4.0

### 🔢 Type-Preserving Feature Writes

Feature modifications now preserve X's existing representation.

Supported forms include:

```text
boolean → boolean
string  → "true" / "false"
number  → 1 / 0
```

This improves compatibility with feature-switch structures that use strict type comparisons.

### ✅ Verified Writes

Target-feature assignments are now read back after modification.

The script separately tracks:

```text
found
changed
writeFailed
```

so diagnostics can distinguish between:

- A feature not being present.
- A feature already having the desired value.
- A successful modification.
- A modification which threw or did not stick.

### 📊 Advanced Diagnostics

Clicking the indicator now prints detailed diagnostics to the browser console.

Diagnostics include:

```text
Current health
Historical errors
Per-hook gate counts
Per-flag found counts
Per-flag changed counts
Per-flag processing/write failures
Birthdate statistics
Potential related keys
Recent errors
```

Known feature counters are pre-seeded with `0`, making features which were not encountered immediately visible.

### 🎂 Verified Birthdate Patching

Birthdate handling now uses:

- Type-preserving scalar conversion.
- Verified assignment.
- Read-back validation.

The script tracks:

```text
birthdate.seen
birthdate.changed
birthdate.failed
```

### 🧠 Improved Status Model

The indicator now separates:

```text
Hook/traversal health
```

from:

```text
Individual feature-write outcomes
```

A transient hook/traversal error can recover to green after a genuinely successful gated patch.

Unrelated `JSON.parse`, `Object.assign`, or response activity cannot falsely clear an error state.

### 🔁 Patch Failure Propagation

Recursive traversal now propagates internal traversal failures back to the originating hook.

A hook only reports successful recovery when its gated patch completed without a traversal error.

### 🔎 Related-Key Diagnostics

Added heuristic discovery of potentially related keys containing terms such as:

```text
age
birth
minor
sensitive
blur
restrict
verif
interstitial
```

This helps investigate X frontend changes while clearly distinguishing candidates from verified feature flags.

### 🛡️ Late `__INITIAL_STATE__` Protection

If AgebypassX starts after X has already populated:

```js
window.__INITIAL_STATE__
```

the existing value is captured and patched before the accessor is installed.

If capturing the existing property fails, AgebypassX leaves it untouched rather than risking state corruption.

Hooks 2–4 remain operational as fallback interception paths.

### 🧹 Metadata Cleanup

The current implementation is described accurately as application-state and parsed-response interception.

Webpack interception is not used or required by v2.4.0.

---

## v2.3.0

### ⌨️ Indicator Hotkey

Added:

```text
Alt + .
```

to show or hide the status indicator.

The preference persists locally across reloads.

### ⚡ Performance Gate

Added a single-pass regular-expression gate for raw JSON payloads.

Deep recursive walks are only performed when potentially relevant feature names are detected.

### 🔍 Smarter Fetch Inspection

`Response.json()` results use a lightweight depth-limited structural scan before the full object patcher runs.

This substantially reduces unnecessary traversal of unrelated responses.

---

## v2.2.0

### 🆕 `Response.json` Hook

Added interception for:

```js
Response.prototype.json
```

because browser-native fetch response parsing can bypass an overridden `JSON.parse`.

### 🔁 Re-Patch Support

Cycle detection became scoped to individual patch operations.

State objects can therefore be patched again if X repopulates them after SPA navigation.

### 🛡️ Defensive Indicator

Improved indicator mounting for `document-start`.

The indicator is automatically restored if the page removes it.

### 🎭 Native Function Compatibility

Wrapped native functions preserve their original:

```text
.name
.length
```

values.

### 🧩 GraphQL Feature Arrays

Added support for:

```js
{
    feature: "feature_name",
    enabled: true
}
```

---

## v2.1.0

### 🎯 Multi-Hook Architecture

Introduced interception through:

```text
__INITIAL_STATE__
Object.assign
JSON.parse
```

### 🚦 Status Indicator

Added the green/red status indicator.

### 🛡️ Hardened Patching

Improved protection against:

- Circular object graphs.
- Throwing getters.
- Non-writable properties.
- Unexpected application objects.
- DOM objects.
- Browser globals.

---

## v1.3.0 — Webpack Edition

### 🆕 Webpack Architecture

Introduced webpack chunk interception for the X frontend architecture used at the time.

### 🎯 Enhanced Detection

Added targeting for sensitive-media-related frontend modules and queries.

### 📊 Advanced Status

Added improved debugging and status information.

### 🔧 Multiple Fallbacks

Added additional interception strategies for network and GraphQL-related paths.

### 🎨 UI Improvements

Expanded the status indicator and debugging interface.

### 🐛 Improved Debugging

Added additional console information and debugging tools.

> The architecture introduced in v1.3.0 should not be confused with modern AgebypassX releases. v2.x now uses application-state and response interception instead of webpack chunk interception.

---

## v1.2 — Enhanced Edition

- Added configuration and state-management improvements.
- Added multiple patching strategies.
- Improved user interface behaviour.
- Improved SPA navigation handling.

---

## v1.1 — Reliability Update

- Added fallback patching methods.
- Improved error handling.
- Expanded patch targets.

---

## v1.0 — Original

- Initial release.
- Basic client-side age-state patching.
- Basic status indicator.

---

## ⚠️ Disclaimer

AgebypassX is an independent open-source project and is not affiliated with, endorsed by, or associated with X Corp., Twitter, Tampermonkey, or Violentmonkey.

The project modifies client-side application state only.

X may change its frontend, feature flags, experiments, response structures, or introduce additional server-side enforcement at any time, which may cause some or all functionality to stop working.

Use the software at your own discretion and comply with the laws, platform rules, and age requirements applicable to you.
