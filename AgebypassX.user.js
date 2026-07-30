// ==UserScript==
// @name         AgebypassX – Webpack Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.3.0
// @description  Modern age bypass for X.com using webpack chunk interception ( Alt + . toggles dot indicator)
// @author       Saganaki22
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Saganaki22/AgebypassX
// @supportURL   https://github.com/Saganaki22/AgebypassX/issues
// @updateURL    https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @downloadURL  https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @connect      none
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const VERSION = '2.3.0';
    let ok = true;

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

    // Single-pass gate regex over the raw text — much faster than repeated
    // indexOf passes on multi-MB payloads. Deep walks only happen on a hit.
    const GATE_RE = new RegExp(
        flagNames.join('|') + '|birthdate|featureSwitch'
    );

    function textMayContainFlags(text) {
        return typeof text === 'string' && GATE_RE.test(text);
    }

    // Depth-limited structural gate for already-parsed objects (fetch .json())
    function objectMayContainFlags(obj, depth) {
        if (!obj || typeof obj !== 'object' || depth < 0) return false;

        let keys;

        try {
            keys = Object.keys(obj);
        } catch (e) {
            return false;
        }

        for (let i = 0; i < keys.length; i++) {
            if (keys[i] in flags || keys[i] === 'birthdate' || keys[i] === 'featureSwitch') {
                return true;
            }
        }

        if (depth === 0) return false;

        for (let j = 0; j < keys.length; j++) {
            let child;

            try {
                child = obj[keys[j]];
            } catch (e) {
                continue;
            }

            if (child && typeof child === 'object' && objectMayContainFlags(child, depth - 1)) {
                return true;
            }
        }

        return false;
    }

    // -----------------------------------------------------------------------
    // Indicator — mounted defensively (document-start has no reliable DOM)
    // Visibility is toggleable with Alt+. and persisted in localStorage.
    // -----------------------------------------------------------------------
    const CSS = '#nox-indicator{position:fixed;top:20px;right:20px;width:16px;height:16px;border-radius:50%;background:#00ff66;border:2px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.3);z-index:9999999;cursor:pointer;transition:all 0.2s ease}#nox-indicator[data-state="ok"]{background:#00ff66;box-shadow:0 0 15px #00ff66}#nox-indicator[data-state="err"]{background:#ff3333;box-shadow:0 0 15px #ff3333}#nox-indicator[data-hidden="true"]{display:none}';

    const LS_KEY = 'nox-indicator-hidden';
    let indicatorHidden = false;

    try {
        indicatorHidden = localStorage.getItem(LS_KEY) === '1';
    } catch (e) {}

    function setIndicatorState(state) {
        const dotEl = document.getElementById('nox-indicator');

        if (dotEl) {
            dotEl.dataset.state = state;
            dotEl.title = 'Nox: ' + (state === 'ok' ? 'ACTIVE' : 'ERROR');
        }
    }

    function applyIndicatorVisibility() {
        const dotEl = document.getElementById('nox-indicator');

        if (dotEl) {
            dotEl.dataset.hidden = indicatorHidden ? 'true' : 'false';
        }
    }

    function markError(e, where) {
        ok = false;
        setIndicatorState('err');
        console.warn('[Nox] ' + where + ' failed', e);
    }

    function onDotClick() {
        alert(
            'Nox v' + VERSION + '\n' +
            'Status: ' + (ok ? 'ACTIVE ✅' : 'ERROR ❌') +
            '\n\nHooks active:\n' +
            '• __INITIAL_STATE__\n' +
            '• Object.assign\n' +
            '• JSON.parse\n' +
            '• Response.json\n\n' +
            'Hotkey: Alt+. toggles this indicator'
        );
    }

    function mountIndicator() {
        const root = document.documentElement;

        if (!root) {
            setTimeout(mountIndicator, 10);
            return;
        }

        if (!document.getElementById('nox-indicator-style')) {
            const style = document.createElement('style');
            style.id = 'nox-indicator-style';
            style.textContent = CSS;
            root.appendChild(style);
        }

        let dot = document.getElementById('nox-indicator');

        if (!dot) {
            dot = document.createElement('div');
            dot.id = 'nox-indicator';
            dot.addEventListener('click', onDotClick);
            root.appendChild(dot);
        }

        dot.dataset.state = ok ? 'ok' : 'err';
        dot.dataset.hidden = indicatorHidden ? 'true' : 'false';
        dot.title = 'Nox: ' + (ok ? 'ACTIVE' : 'ERROR');
    }

    mountIndicator();

    // Re-mount if the parser or SPA navigation wipes the dot
    (function watchIndicator() {
        const root = document.documentElement;

        if (!root) {
            setTimeout(watchIndicator, 10);
            return;
        }

        new MutationObserver(function() {
            if (!document.getElementById('nox-indicator')) {
                mountIndicator();
            }
        }).observe(root, { childList: true });
    })();

    // -----------------------------------------------------------------------
    // Hotkey: Alt+. toggles the indicator (persisted)
    // Attached on document with capture so it works from document-start and
    // can't be swallowed by the page's own handlers.
    // -----------------------------------------------------------------------
    document.addEventListener('keydown', function(e) {
        if (
            e.altKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.shiftKey &&
            e.code === 'Period'
        ) {
            e.preventDefault();
            e.stopPropagation();

            indicatorHidden = !indicatorHidden;

            try {
                localStorage.setItem(LS_KEY, indicatorHidden ? '1' : '0');
            } catch (err) {}

            applyIndicatorVisibility();
            console.log('[Nox] Indicator ' + (indicatorHidden ? 'hidden' : 'visible'));
        }
    }, true);

    // -----------------------------------------------------------------------
    // Patcher
    // -----------------------------------------------------------------------
    function isSafeObject(val, visited) {
        if (!val || typeof val !== 'object') return false;
        if (visited.has(val)) return false;

        // Skip DOM nodes, Window, Document, etc.
        if (typeof Node !== 'undefined' && val instanceof Node) return false;
        if (val === window) return false;
        if (val === document) return false;

        return true;
    }

    function applyFlags(obj) {
        for (let i = 0; i < flagNames.length; i++) {
            const key = flagNames[i];

            try {
                if (key in obj && obj[key] !== undefined) {
                    const val = obj[key];

                    if (val && typeof val === 'object' && 'value' in val) {
                        val.value = flags[key];
                    } else {
                        obj[key] = flags[key];
                    }
                }
            } catch (e) {
                // Skip properties that throw on access/write
            }
        }
    }

    function walk(obj, visited) {
        if (!isSafeObject(obj, visited)) return;
        visited.add(obj);

        try {
            // Direct flag patching ({flag: bool} and {flag: {value: bool}})
            applyFlags(obj);

            // GraphQL feature-array entries: {feature: "name", enabled: bool}
            try {
                if (
                    typeof obj.feature === 'string' &&
                    obj.feature in flags &&
                    'enabled' in obj
                ) {
                    obj.enabled = flags[obj.feature];
                }
            } catch (e) {}

            // Birthdate spoofing
            try {
                if (obj.birthdate && typeof obj.birthdate === 'object') {
                    obj.birthdate.year = 1990;
                    obj.birthdate.day = 1;
                    obj.birthdate.month = 1;
                }
            } catch (e) {}

            // Recurse safely — only enumerable own properties
            const keys = Object.keys(obj);

            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];

                if (
                    k === 'window' ||
                    k === 'document' ||
                    k === 'parent' ||
                    k === 'top'
                ) {
                    continue;
                }

                let child;

                try {
                    child = obj[k];
                } catch (e) {
                    continue;
                }

                if (isSafeObject(child, visited)) {
                    walk(child, visited);
                }
            }
        } catch (e) {
            console.warn('[Nox] Patch error:', e);
        }
    }

    // Per-call visited set: cycle protection within one pass, but the same
    // object CAN be re-patched later if X re-populates it (old global WeakSet
    // permanently blocked re-patching after SPA navigation).
    function patch(root) {
        walk(root, new WeakSet());
    }

    // Make overrides look native (correct .length/.name) so feature
    // detection in page code doesn't trip on them.
    function spoofAs(nativeFn, fn, name) {
        try {
            Object.defineProperty(fn, 'length', {
                value: nativeFn.length,
                configurable: true
            });
        } catch (e) {}

        try {
            Object.defineProperty(fn, 'name', {
                value: name,
                configurable: true
            });
        } catch (e) {}
    }

    console.log('[Nox] Loaded');

    // -----------------------------------------------------------------------
    // Hook 1: __INITIAL_STATE__
    // -----------------------------------------------------------------------
    try {
        let stateVal;

        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,

            get: function() {
                return stateVal;
            },

            set: function(newValue) {
                try {
                    patch(newValue);
                    console.log('[Nox] Patched __INITIAL_STATE__');
                    setIndicatorState('ok');
                } catch (e) {
                    markError(e, 'State patch');
                }

                stateVal = newValue;
            }
        });
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
            if (target && typeof target === 'object') {
                if (target.featureSwitch || target.entities || target.users) {
                    patch(target);
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
                patch(result);
            }
        } catch (e) {
            markError(e, 'JSON.parse patch');
        }

        return result;
    }

    spoofAs(originalParse, noxParse, 'parse');
    JSON.parse = noxParse;

    // -----------------------------------------------------------------------
    // Hook 4: Response.json — fetch() responses bypass the JSON.parse hook
    // entirely (browser parses internally), so this path was never patched.
    // -----------------------------------------------------------------------
    try {
        if (
            window.Response &&
            Response.prototype &&
            typeof Response.prototype.json === 'function'
        ) {
            const originalJson = Response.prototype.json;

            function noxJson() {
                return originalJson.apply(this, arguments).then(function(data) {
                    try {
                        if (
                            data &&
                            typeof data === 'object' &&
                            objectMayContainFlags(data, 3)
                        ) {
                            patch(data);
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

    console.log('[Nox] Ready');
})();
