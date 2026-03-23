// ==UserScript==
// @name         AgebypassX – Webpack Edition (Interstitial Removed)
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.2.0
// @description  Bypass X.com age restrictions + remove "verify your age" interstitials & unblur sensitive tweet media (2026 fix)
// @author       Saganaki22 (enhanced by community)
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Saganaki22/AgebypassX
// @supportURL   https://github.com/Saganaki22/AgebypassX/issues
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // === UI Indicator + Aggressive CSS Fixes ===
    const style = document.createElement('style');
    style.textContent = `
        #agebypassx-indicator {
            position: fixed; top: 20px; right: 20px; width: 16px; height: 16px;
            border-radius: 50%; background: #00ff66; border: 2px solid #fff;
            box-shadow: 0 0 10px rgba(0,0,0,0.3); z-index: 9999999;
            cursor: pointer; transition: all 0.2s ease;
        }
        #agebypassx-indicator[data-state="ok"]  { background: #00ff66; box-shadow: 0 0 15px #00ff66; }
        #agebypassx-indicator[data-state="err"] { background: #ff3333; box-shadow: 0 0 15px #ff3333; }

        /* === REMOVE AGE INTERSTITIAL & UNBLUR MEDIA IN TWEETS === */
        /* Hide entire sensitive content warning overlays */
        [data-testid="tweet"] [role="alert"],
        [data-testid="tweet"] div[dir="ltr"]:has-text("Age-restricted adult content"),
        [data-testid="tweet"] div:has(> button > span > span:has-text("Show")),
        [data-testid="sensitiveContentWarning"],
        div[style*="backdrop-filter: blur"],
        div.r-1kihuf0.r-3o4zer,
        .r-1867qdf.r-16y2uox:has([style*="blur"]) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        /* Force show & unblur media containers */
        [data-testid="tweet"] img,
        [data-testid="tweet"] .r-1niwhzg.r-vvn4in.r-u6sd8q,
        [data-testid="tweet"] .r-1mlwlqe.r-1udh08x.r-417010,
        [data-testid="tweet"] div[style*="background-image: url"][style*="pbs.twimg.com/media"] {
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        /* Remove any inline blur/backdrop on images or parents */
        *[style*="filter: blur"], *[style*="backdrop-filter"], img[style*="blur"] {
            filter: none !important;
            -webkit-filter: none !important;
            backdrop-filter: none !important;
        }

        /* Profile fixes (from previous version) */
        img[src*="profile_images"], [data-testid="UserAvatar"] img, div[role="img"] > img {
            filter: none !important;
        }
    `;
    document.documentElement.appendChild(style);

    const dot = document.createElement('div');
    dot.id = 'agebypassx-indicator';
    dot.dataset.state = 'ok';
    dot.title = 'AgebypassX: ACTIVE (interstitials removed)';
    document.documentElement.appendChild(dot);

    let ok = true;
    const visited = new WeakSet();

    function isSafeObject(val) {
        if (!val || typeof val !== 'object') return false;
        if (visited.has(val)) return false;
        if (val instanceof Node || val === window || val === document) return false;
        return true;
    }

    function patch(obj) {
        if (!isSafeObject(obj)) return;
        visited.add(obj);

        try {
            // Expanded flags — target interstitial + sensitive media gates
            const flags = {
                'rweb_age_assurance_flow_enabled': false,
                'age_verification_gate_enabled': false,
                'sensitive_tweet_warnings_enabled': false,
                'sensitive_media_settings_enabled': true,
                'grok_settings_age_restriction_enabled': false,
                'rweb_mvr_blurred_media_interstitial_enabled': false,
                'blurred_media_interstitial_enabled': false,
                'sensitive_media_interstitial_enabled': false,
                'rweb_sensitive_media_interstitial_enabled': false,
                'profile_sensitive_content_warning_enabled': false,
                'timeline_sensitive_media_interstitial_enabled': false,
                // Newer 2025–2026 flags for per-tweet age gates
                'rweb_age_gate_interstitial_enabled': false,
                'sensitive_content_age_gate_enabled': false,
                'media_age_restriction_interstitial': false,
                'rweb_sensitive_content_warning_v2_enabled': false,
                'age_restricted_content_gate': false
            };

            for (const key in flags) {
                try {
                    if (key in obj) {
                        const val = obj[key];
                        if (val && typeof val === 'object' && 'value' in val) {
                            val.value = flags[key];
                        } else {
                            obj[key] = flags[key];
                        }
                    }
                } catch {}
            }

            // Birthdate spoof
            if (obj.birthdate && typeof obj.birthdate === 'object') {
                obj.birthdate.year = 1990;
                obj.birthdate.day = 1;
                obj.birthdate.month = 1;
            }

            // Recurse
            Object.keys(obj).forEach(k => {
                if (['window','document','parent','top'].includes(k)) return;
                const child = obj[k];
                if (isSafeObject(child)) patch(child);
            });
        } catch(e) {
            console.warn('[AgebypassX] Patch error:', e);
        }
    }

    console.log('[AgebypassX] Loaded – interstitial removal active');

    // Hook __INITIAL_STATE__
    try {
        let stateVal;
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true, enumerable: true,
            get: () => stateVal,
            set: newValue => {
                try {
                    patch(newValue);
                    console.log('[AgebypassX] Patched __INITIAL_STATE__');
                } catch(e) {
                    console.warn('[AgebypassX] State patch failed', e);
                    ok = false;
                }
                stateVal = newValue;
                updateIndicator();
            }
        });
    } catch(e) {
        console.error('[AgebypassX] __INITIAL_STATE__ hook failed', e);
        ok = false;
    }

    // Hook Object.assign for state merges
    const originalAssign = Object.assign;
    Object.assign = function(target, ...sources) {
        const result = originalAssign.apply(this, arguments);
        if (target && typeof target === 'object' && (target.featureSwitch || target.entities || target.users)) {
            patch(target);
        }
        return result;
    };

    // Hook JSON.parse for API
    const originalParse = JSON.parse;
    JSON.parse = function(text) {
        const result = originalParse.apply(this, arguments);
        if (result && typeof result === 'object' && !Array.isArray(result) && (result.data || result.featureSwitch)) {
            patch(result);
        }
        return result;
    };

    // Dynamic cleanup: watch DOM for injected interstitials
    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            if (m.addedNodes) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Hide any newly added warning blocks
                        if (node.matches('[dir="ltr"] span:has-text("Age-restricted"), button > span > span:has-text("Show")') ||
                            node.querySelector('[style*="backdrop-filter"]') ||
                            node.innerHTML.includes('verify your age')) {
                            node.style.display = 'none';
                            node.remove(); // aggressive removal
                        }
                        // Unblur media
                        node.querySelectorAll('img, div[style*="background-image"]').forEach(el => {
                            el.style.filter = 'none';
                            el.style.webkitFilter = 'none';
                            el.style.backdropFilter = 'none';
                            if (el.parentElement) el.parentElement.style.filter = 'none';
                        });
                    }
                });
            }
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    function updateIndicator() {
        const el = document.getElementById('agebypassx-indicator');
        if (el) {
            el.dataset.state = ok ? 'ok' : 'err';
            el.title = 'AgebypassX: ' + (ok ? 'ACTIVE (interstitials removed)' : 'ERROR');
        }
    }

    dot.addEventListener('click', () => {
        alert('AgebypassX v2.2.0 – Interstitial Removal\nStatus: ' + (ok ? 'ACTIVE ✅' : 'ERROR ❌') +
              '\n\nFeatures:\n• Patched flags (age gates & interstitials)\n• CSS unblur + hide overlays\n• MutationObserver for dynamic removal\n• Works on tweet media');
    });

    console.log('[AgebypassX] Ready – interstitials should now be gone');
    updateIndicator();
})();
