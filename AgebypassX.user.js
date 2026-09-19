// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.4.1
// @description  Age/sensitive-media bypass for X.com via initial-state and JSON feature-switch patching (Alt+. toggles the dot indicator; click it for diagnostics)
// @author       Saganaki22
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Saganaki22/AgebypassX
// @supportURL   https://github.com/Saganaki22/AgebypassX/issues
// NOTE: update these URLs if you republish under a new slug
// @updateURL    https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @downloadURL  https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @noframes
// ==/UserScript==

(function() {
    'use strict';
    
    // GM_info stays available under @grant none in Tampermonkey and
    // Violentmonkey; the typeof guard covers managers where it isn't.
    let VERSION = '2.4.1';
    try {
        if (typeof GM_info !== 'undefined' && GM_info && GM_info.script && GM_info.script.version) {
            VERSION = GM_info.script.version;
        }
    } catch (e) {}

    // -----------------------------------------------------------------------
    // Target flags
    // -----------------------------------------------------------------------
    const flags = {
        'rweb_age_assurance_flow_enabled': false,
        'age_verification_gate_enabled': false,
        'sensitive_tweet_warnings_enabled': false,
        'sensitive_media_settings_enabled': true,
        'grok_settings_age_restriction_enabled': false,
        'rweb_mvr_blurred_media_interstitial_enabled': false
    };

    const flagNames = Object.keys(flags);

    // Spoofed birthdate (any 18+ date is functionally equivalent)
    const BIRTHDATE = { year: 1990, month: 1, day: 1 };

    // Structural pre-scan depth for Response.json payloads. Deliberately
    // generous: a false negative here silently skips patching, while a
    // false positive only costs one walk.
    const JSON_SCAN_DEPTH = 5;
    const DEFAULT_WALK_DEPTH = 30;

    const MAX_ERROR_LOG = 20;
    const MAX_UNKNOWN_LOG = 50;

    // -----------------------------------------------------------------------
    // Status model — separates current health (recoverable) from
    // historical error count (cumulative). markOk() is ONLY called after
    // a gated patch ran and completed without internal patch errors;
    // unrelated hook invocations never restore the indicator.
    //
    // The dot reflects hook/traversal health only. Individual target-flag
    // writes that throw or don't stick are recorded in stats.writeFailed
    // (diagnostics), not as traversal failures.
    // 
    // -----------------------------------------------------------------------
    const status = { ok: true, errors: 0 };

    function zeroFlagCounts() {
        const o = {};
        for (let i = 0; i < flagNames.length; i++) o[flagNames[i]] = 0;
        return o;
    }

    const stats = {
        gateHits:    { state: 0, assign: 0, parse: 0, json: 0 },
        found:       zeroFlagCounts(),  // per flag: times encountered (pre-seeded so zeros are visible)
        changed:     zeroFlagCounts(),  // per flag: value actually moved AND read back correct
        writeFailed: zeroFlagCounts(),  // per flag: couldn't be processed/written (throw on access,
                                        // write threw, or read-back mismatch)
        birthdate:   { seen: 0, changed: 0, failed: 0 },
        unknown:     [],                // candidate related keys — NOT verified flags
        errors:      []                 // ring buffer of recent {where, message}
    };

    let lastErrLog = 0;

    function markError(e, where) {
        status.ok = false;
        status.errors++;

        stats.errors.push({
            where: where,
            message: (e && e.message) ? e.message : String(e)
        });
        if (stats.errors.length > MAX_ERROR_LOG) stats.errors.shift();

        setIndicatorState('err');

        const now = Date.now();
        if (now - lastErrLog > 1000) {
            lastErrLog = now;
            console.warn('[Nox] ' + where + ' failed', e);
        }
    }

    function markOk() {
        if (!status.ok) {
            status.ok = true;
            setIndicatorState('ok');
        }
    }

    // -----------------------------------------------------------------------
    // Gates
    // -----------------------------------------------------------------------
    const GATE_RE = new RegExp(
        flagNames.join('|') + '|birthdate|featureSwitch'
    );

    function textMayContainFlags(text) {
        return typeof text === 'string' && GATE_RE.test(text);
    }

    const hasOwn = Object.prototype.hasOwnProperty;

    function objectMayContainFlags(obj, depth) {
        if (!obj || typeof obj !== 'object' || depth < 0) return false;

        let keys;
        try { keys = Object.keys(obj); } catch (e) { return false; }

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (hasOwn.call(flags, k) || k === 'birthdate' || k === 'featureSwitch') {
                return true;
            }
        }

        if (depth === 0) return false;

        for (let j = 0; j < keys.length; j++) {
            let child;
            try { child = obj[keys[j]]; } catch (e) { continue; }

            if (child && typeof child === 'object' && objectMayContainFlags(child, depth - 1)) {
                return true;
            }
        }

        return false;
    }

    // -----------------------------------------------------------------------
    // Indicator
    // -----------------------------------------------------------------------
    const CSS = '#nox-indicator{position:fixed;top:20px;right:20px;width:16px;height:16px;border-radius:50%;background:#00ff66;border:2px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.3);z-index:9999999;cursor:pointer;transition:all 0.2s ease}#nox-indicator[data-state="ok"]{background:#00ff66;box-shadow:0 0 15px #00ff66}#nox-indicator[data-state="err"]{background:#ff3333;box-shadow:0 0 15px #ff3333}#nox-indicator[data-hidden="true"]{display:none}';

    const LS_KEY = 'nox-indicator-hidden';
    let indicatorHidden = false;

    try { indicatorHidden = localStorage.getItem(LS_KEY) === '1'; } catch (e) {}

    function setIndicatorState(state) {
        const dotEl = document.getElementById('nox-indicator');
        if (dotEl) {
            dotEl.dataset.state = state;
            dotEl.title = 'Nox: ' + (state === 'ok' ? 'ACTIVE' : 'ERROR') + ' — click for diagnostics in console';
        }
    }

    function applyIndicatorVisibility() {
        const dotEl = document.getElementById('nox-indicator');
        if (dotEl) dotEl.dataset.hidden = indicatorHidden ? 'true' : 'false';
    }

    function onDotClick() {
        console.group('[Nox] diagnostics v' + VERSION);
        console.log('status:', status.ok ? 'ACTIVE' : 'ERROR', '| total errors:', status.errors);

        console.log('gate hits:', stats.gateHits);

        console.log('flags found:', stats.found);
        console.log('flags changed:', stats.changed);
        console.log('flag process/write failures:', stats.writeFailed);
        console.log('birthdate:', stats.birthdate);

        // How to read the counters above, per flag:
        //   found > 0, changed > 0, writeFailed = 0
        //       -> working normally
        //   found > 0, changed = 0, writeFailed = 0
        //       -> already had the desired value
        //   found > 0, writeFailed > 0
        //       -> flag exposed but couldn't be fully processed/written
        //          (covers throws on read, failed writes, read-back
        //          mismatches)
        //   found = 0
        //       -> not encountered; possible rename/removal/experiment/
        //          region difference (warning signal, not proof)
        console.log('reading guide:\n' +
            '  found>0 changed>0 writeFailed=0 : working normally\n' +
            '  found>0 changed=0 writeFailed=0 : already at desired value\n' +
            '  found>0 writeFailed>0           : flag present, processing/writes incomplete\n' +
            '  found=0                         : not encountered (rename/removal/experiment/region)');

        if (stats.unknown.length) {
            console.info('related keys seen near known structures (NOT verified flags):', stats.unknown);
        }
        if (stats.errors.length) {
            console.warn('recent errors:', stats.errors);
        }
        console.groupEnd();
    }

    function mountIndicator() {
        const target = document.head || document.body || document.documentElement;
        if (!target) {
            setTimeout(mountIndicator, 10);
            return;
        }

        if (!document.getElementById('nox-indicator-style')) {
            const style = document.createElement('style');
            style.id = 'nox-indicator-style';
            style.textContent = CSS;
            target.appendChild(style);
        }

        const bodyTarget = document.body || document.documentElement;
        let dot = document.getElementById('nox-indicator');
        if (!dot && bodyTarget) {
            dot = document.createElement('div');
            dot.id = 'nox-indicator';
            dot.addEventListener('click', onDotClick);
            bodyTarget.appendChild(dot);
        }

        if (dot) {
            dot.dataset.state = status.ok ? 'ok' : 'err';
            dot.dataset.hidden = indicatorHidden ? 'true' : 'false';
            dot.title = 'Nox: ' + (status.ok ? 'ACTIVE' : 'ERROR') + ' — click for diagnostics in console';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountIndicator);
    } else {
        mountIndicator();
    }

    (function watchIndicator() {
        const root = document.documentElement;
        if (!root) { setTimeout(watchIndicator, 10); return; }

        new MutationObserver(function() {
            if (!document.getElementById('nox-indicator') && (document.body || document.documentElement)) {
                mountIndicator();
            }
        }).observe(root, { childList: true });
    })();

    // -----------------------------------------------------------------------
    // Hotkey: Alt+. toggles the indicator (persisted)
    // -----------------------------------------------------------------------
    document.addEventListener('keydown', function(e) {
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'Period') {
            e.preventDefault();
            e.stopPropagation();

            indicatorHidden = !indicatorHidden;
            try { localStorage.setItem(LS_KEY, indicatorHidden ? '1' : '0'); } catch (err) {}
            applyIndicatorVisibility();
        }
    }, true);

    // -----------------------------------------------------------------------
    // Patcher
    // -----------------------------------------------------------------------
    function isSafeObject(val, visited) {
        if (!val || typeof val !== 'object') return false;
        if (visited.has(val)) return false;
        if (typeof Node !== 'undefined' && val instanceof Node) return false;
        if (val === window || val === document) return false;
        return true;
    }

    function isPlainObject(val) {
        if (!val || typeof val !== 'object') return false;
        const proto = Object.getPrototypeOf(val);
        return proto === null || proto === Object.prototype;
    }
    
    // Boolean coercion for feature flags: number-typed switches are 1/0.
    // Do NOT use for non-boolean desired values (birthdate etc.).
    function coerceLike(sample, desired) {
        if (typeof sample === 'string') return String(desired);
        if (typeof sample === 'number') return desired ? 1 : 0;
        return desired;
    }
    
    // General scalar coercion for non-boolean desired values: preserves
    // string/number typing of the stored value without truthiness
    // collapsing (coerceLike(1995, 1990) would return 1!).
    function coerceScalarLike(sample, desired) {
        if (typeof sample === 'string') return String(desired);
        if (typeof sample === 'number') return Number(desired);
        return desired;
    }

    // Verified write: assign, then read back. Catches both throwing
    // assignments (via the caller's catch) and setters that accept the
    // write without retaining the value (read-back mismatch).
    function verifiedWrite(obj, key, next) {
        obj[key] = next;
        return obj[key] === next;
    }

    function count(map, key) {
        map[key] = (map[key] || 0) + 1;
    }

    function applyFlags(obj) {
        for (let i = 0; i < flagNames.length; i++) {
            const key = flagNames[i];
            try {
                if (key in obj && obj[key] !== undefined) {
                    count(stats.found, key);
                    const val = obj[key];

                    if (val && typeof val === 'object' && 'value' in val) {
                        const next = coerceLike(val.value, flags[key]);
                        if (val.value !== next) {
                            if (verifiedWrite(val, 'value', next)) {
                                count(stats.changed, key);
                            } else {
                                count(stats.writeFailed, key);
                            }
                        }
                    } else {
                        const next = coerceLike(val, flags[key]);
                        if (obj[key] !== next) {
                            if (verifiedWrite(obj, key, next)) {
                                count(stats.changed, key);
                            } else {
                                count(stats.writeFailed, key);
                            }
                        }
                    }
                }
            } catch (e) {
                // Covers throws anywhere in the per-flag block, including
                // reads — hence "process/write failures".
                count(stats.writeFailed, key);
            }
        }
    }

    // Heuristic scanner: reports keys that LOOK related (age/birth/sensitive/
    // blur/restrict/...) encountered during walks.
    //
    // SCOPE LIMITATION: this only runs inside walk(), and walk() is only
    // entered after a gate matched a KNOWN term. A fully renamed flag
    // structure may never reach this scanner. It discovers additional
    // flags adjacent to known structures — it is NOT a complete rename
    // detector.
    const HINT_RE = /(^|[^a-z])(age|birth|minor|sensitive|blur|restrict|verif|interstitial)([^a-z]|$)/i;
    const seenHints = new Set();

    function scanForRelatedKeys(obj) {
        let keys;
        try { keys = Object.keys(obj); } catch (e) { return; }

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (!(k in flags) && !seenHints.has(k) && HINT_RE.test(k)) {
                seenHints.add(k);
                if (stats.unknown.length < MAX_UNKNOWN_LOG) {
                    stats.unknown.push(k);
                }
                let sample;
                try { sample = String(obj[k]).slice(0, 100); } catch (e) { sample = '(throws)'; }
                console.info('[Nox] related key seen:', k, '=', sample);
            }
        }
    }

    // Returns true only if this subtree (and all descendants) completed
    // without an internal traversal error. Target-flag writes that throw
    // or fail read-back are recorded in stats.writeFailed (diagnostics)
    // but do NOT fail the traversal — the dot reflects hook/traversal
    // health, diagnostics carry per-flag write outcomes.
    function walk(obj, visited, maxDepth = DEFAULT_WALK_DEPTH, currentDepth = 0) {
        if (currentDepth > maxDepth) return true;
        if (!isSafeObject(obj, visited)) return true;

        visited.add(obj);
        let ok = true;

        try {
            applyFlags(obj);
            scanForRelatedKeys(obj);

            // GraphQL feature-array entries: {feature: "name", enabled: <bool>}
            try {
                const fname = obj.feature;
                if (typeof fname === 'string' && fname in flags && 'enabled' in obj) {
                    count(stats.found, fname);
                    try {
                        const next = coerceLike(obj.enabled, flags[fname]);
                        if (obj.enabled !== next) {
                            if (verifiedWrite(obj, 'enabled', next)) {
                                count(stats.changed, fname);
                            } else {
                                count(stats.writeFailed, fname);
                            }
                        }
                    } catch (e) {
                        count(stats.writeFailed, fname);
                    }
                }
            } catch (e) {}

            // Birthdate spoofing — type-preserving, verified writes; same
            // machinery as the flags. Missing fields are filled with
            // plain numbers; existing string/number types are preserved.
            try {
                if (obj.birthdate && typeof obj.birthdate === 'object') {
                    stats.birthdate.seen++;
                    const b = obj.birthdate;
                    const fields = [
                        ['year',  BIRTHDATE.year],
                        ['month', BIRTHDATE.month],
                        ['day',   BIRTHDATE.day]
                    ];

                    for (let i = 0; i < fields.length; i++) {
                        try {
                            const cur = b[fields[i][0]];
                            const next = coerceScalarLike(cur, fields[i][1]);
                            if (cur !== next) {
                                if (verifiedWrite(b, fields[i][0], next)) {
                                    stats.birthdate.changed++;
                                } else {
                                    stats.birthdate.failed++;
                                }
                            }
                        } catch (e) {
                            stats.birthdate.failed++;
                        }
                    }
                }
            } catch (e) {}

            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (k === 'window' || k === 'document' || k === 'parent' || k === 'top') continue;

                let child;
                try { child = obj[k]; } catch (e) { continue; }

                if (isSafeObject(child, visited)) {
                    if (!walk(child, visited, maxDepth, currentDepth + 1)) ok = false;
                }
            }
        } catch (e) {
            markError(e, 'walk');
            ok = false;
        }

        return ok;
    }

    // True = traversal completed with no internal patch error.
    function patch(root, maxDepth = DEFAULT_WALK_DEPTH) {
        return walk(root, new WeakSet(), maxDepth, 0);
    }

    function spoofAs(nativeFn, fn, name) {
        try {
            Object.defineProperty(fn, 'length', { value: nativeFn.length, configurable: true });
        } catch (e) {}
        try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
        } catch (e) {}
        try {
            fn.toString = function() {
                return nativeFn.toString();
            };
        } catch (e) {}
    }

    console.log('[Nox] v' + VERSION + ' loaded');

    // -----------------------------------------------------------------------
    // Hook 1: __INITIAL_STATE__
    // -----------------------------------------------------------------------
    try {
        let stateVal;
        let canInstallStateHook = true;

        // If injection ran slightly late (after X's first assignment),
        // capture the existing value and patch it BEFORE installing the
        // accessor — otherwise defineProperty() would replace the
        // populated property with an accessor backed by undefined.
        //
        // If the capture itself fails (e.g. an existing getter throws),
        // do NOT install our accessor: replacing the property then would
        // destroy the live state. Leave it alone; Hooks 2–4 still run.
        try {
            if (Object.prototype.hasOwnProperty.call(window, '__INITIAL_STATE__')) {
                stateVal = window.__INITIAL_STATE__;

                if (stateVal && typeof stateVal === 'object') {
                    stats.gateHits.state++;
                    if (patch(stateVal)) markOk();
                }
            }
        } catch (e) {
            canInstallStateHook = false;
            markError(e, 'Existing state capture');
        }

        if (canInstallStateHook) {
            Object.defineProperty(window, '__INITIAL_STATE__', {
                configurable: true,
                enumerable: true,

                get: function() { return stateVal; },

                set: function(newValue) {
                    // Only treat object assignments as patch attempts, so a
                    // primitive/undefined assignment can't produce a vacuous
                    // patch() -> true -> markOk() after an earlier error.
                    if (newValue && typeof newValue === 'object') {
                        stats.gateHits.state++;
                        try {
                            if (patch(newValue)) markOk();
                        } catch (e) {
                            markError(e, 'State patch');
                        }
                    }
                    stateVal = newValue;
                }
            });
        }
    } catch (e) {
        markError(e, '__INITIAL_STATE__ hook');
    }

    // -----------------------------------------------------------------------
    // Hook 2: Object.assign — only patch state-like objects
    // -----------------------------------------------------------------------
    const originalAssign = Object.assign;

    function noxAssign(target) {
        const result = originalAssign.apply(this, arguments);
        try {
            if (isPlainObject(target)) {
                if (target.featureSwitch || target.entities || target.users) {
                    stats.gateHits.assign++;
                    if (patch(target)) markOk();
                }
            }
        } catch (e) {
            markError(e, 'Object.assign patch');
        }
        return result;
    }

    spoofAs(originalAssign, noxAssign, 'assign');
    Object.assign = noxAssign;

    // -----------------------------------------------------------------------
    // Hook 3: JSON.parse — gated on exact flag names in the raw text
    // -----------------------------------------------------------------------
    const originalParse = JSON.parse;

    function noxParse(text, reviver) {
        const result = originalParse.apply(this, arguments);
        try {
            if (result && typeof result === 'object' && textMayContainFlags(text)) {
                stats.gateHits.parse++;
                if (patch(result)) markOk();
            }
        } catch (e) {
            markError(e, 'JSON.parse patch');
        }
        return result;
    }

    spoofAs(originalParse, noxParse, 'parse');
    JSON.parse = noxParse;

    // -----------------------------------------------------------------------
    // Hook 4: Response.json — fetch responses parse internally and
    // bypass the JSON.parse hook. (response.text() → JSON.parse and
    // WebSocket frames → JSON.parse are already covered by Hook 3.)
    // 
    // -----------------------------------------------------------------------
    try {
        if (window.Response && Response.prototype && typeof Response.prototype.json === 'function') {
            const originalJson = Response.prototype.json;

            function noxJson() {
                return originalJson.apply(this, arguments).then(function(data) {
                    try {
                        if (data && typeof data === 'object' && objectMayContainFlags(data, JSON_SCAN_DEPTH)) {
                            stats.gateHits.json++;
                            if (patch(data)) markOk();
                        }
                    } catch (e) {
                        markError(e, 'Response.json patch');
                    }
                    return data;
                });
            }

            spoofAs(originalJson, noxJson, 'json');
            Response.prototype.json = noxJson;
        }
    } catch (e) {
        markError(e, 'Response.json hook');
    }

    console.log('[Nox] ready — click the dot for diagnostics');
})();
