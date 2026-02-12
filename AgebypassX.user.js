// ==UserScript==
// @name         AgebypassX – Webpack Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.1.0
// @description  Modern age bypass for X.com using webpack chunk interception
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

    // UI Indicator
    const style = document.createElement('style');
    style.textContent = '#agebypassx-indicator{position:fixed;top:20px;right:20px;width:16px;height:16px;border-radius:50%;background:#00ff66;border:2px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.3);z-index:9999999;cursor:pointer;transition:all 0.2s ease}#agebypassx-indicator[data-state="ok"]{background:#00ff66;box-shadow:0 0 15px #00ff66}#agebypassx-indicator[data-state="err"]{background:#ff3333;box-shadow:0 0 15px #ff3333}';
    document.documentElement.appendChild(style);

    const dot = document.createElement('div');
    dot.id = 'agebypassx-indicator';
    dot.dataset.state = 'ok';
    dot.title = 'AgebypassX: ACTIVE';
    document.documentElement.appendChild(dot);

    let ok = true;
    const visited = new WeakSet();

    // Safely check if value is a plain object we should process
    function isSafeObject(val) {
        if (!val || typeof val !== 'object') return false;
        if (visited.has(val)) return false;

        // Skip DOM nodes, Window, Document, etc.
        if (val instanceof Node) return false;
        if (val === window) return false;
        if (val === document) return false;

        return true;
    }

    // Patch function with full error protection
    function patch(obj) {
        if (!isSafeObject(obj)) return;
        visited.add(obj);

        try {
            // Direct flag patching
            const flags = {
                'rweb_age_assurance_flow_enabled': false,
                'age_verification_gate_enabled': false,
                'sensitive_tweet_warnings_enabled': false,
                'sensitive_media_settings_enabled': true,
                'grok_settings_age_restriction_enabled': false,
                'rweb_mvr_blurred_media_interstitial_enabled': false
            };

            for (const key in flags) {
                try {
                    if (key in obj && obj[key] !== undefined) {
                        const val = obj[key];
                        if (val && typeof val === 'object' && 'value' in val) {
                            val.value = flags[key];
                        } else {
                            obj[key] = flags[key];
                        }
                    }
                } catch(e) {
                    // Skip properties that throw on access
                }
            }

            // Birthdate spoofing
            try {
                if (obj.birthdate && typeof obj.birthdate === 'object') {
                    obj.birthdate.year = 1990;
                    obj.birthdate.day = 1;
                    obj.birthdate.month = 1;
                }
            } catch(e) {}

            // Recurse safely - only enumerable own properties
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (k === 'window' || k === 'document' || k === 'parent' || k === 'top') continue;

                try {
                    const child = obj[k];
                    if (isSafeObject(child)) {
                        patch(child);
                    }
                } catch(e) {
                    // Skip problematic properties
                }
            }
        } catch(e) {
            console.warn('[AgebypassX] Patch error:', e);
        }
    }

    console.log('[AgebypassX] Loaded');

    // Hook 1: __INITIAL_STATE__
    try {
        let stateVal;
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,
            get: function() { return stateVal; },
            set: function(newValue) {
                try {
                    patch(newValue);
                    console.log('[AgebypassX] Patched __INITIAL_STATE__');
                } catch(e) {
                    console.warn('[AgebypassX] State patch failed', e);
                    ok = false;
                }
                stateVal = newValue;
                const dotEl = document.getElementById('agebypassx-indicator');
                if (dotEl) {
                    dotEl.dataset.state = ok ? 'ok' : 'err';
                    dotEl.title = 'AgebypassX: ' + (ok ? 'ACTIVE' : 'ERROR');
                }
            }
        });
    } catch(e) {
        console.error('[AgebypassX] __INITIAL_STATE__ hook failed', e);
        ok = false;
    }

    // Hook 2: Object.assign - only patch if it's a state-like object
    const originalAssign = Object.assign;
    Object.assign = function(target) {
        const result = originalAssign.apply(this, arguments);
        if (target && typeof target === 'object') {
            // Only patch if it looks like a state object
            if (target.featureSwitch || target.entities || target.users) {
                patch(target);
            }
        }
        return result;
    };

    // Hook 3: JSON.parse - wrap to catch API responses
    const originalParse = JSON.parse;
    JSON.parse = function(text) {
        const result = originalParse.apply(this, arguments);
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            // Check if it looks like Twitter API response
            if (result.data || result.errors || result.featureSwitch) {
                patch(result);
            }
        }
        return result;
    };

    // Click handler
    dot.addEventListener('click', function() {
        alert('AgebypassX v2.0.2\nStatus: ' + (ok ? 'ACTIVE ✅' : 'ERROR ❌') + '\n\nHooks active:\n• __INITIAL_STATE__\n• Object.assign\n• JSON.parse');
    });

    console.log('[AgebypassX] Ready');
})();
