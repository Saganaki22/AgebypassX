// ==UserScript==
// @name         AgebypassX
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const patch = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const flags = {
            'rweb_age_assurance_flow_enabled': false,
            'age_verification_gate_enabled': false,
            'sensitive_tweet_warnings_enabled': false,
            'sensitive_media_settings_enabled': true,
            'grok_settings_age_restriction_enabled': false,
            'rweb_mvr_blurred_media_interstitial_enabled': false
        };
        for (const [key, val] of Object.entries(flags)) {
            if (obj[key] !== undefined) {
                if (typeof obj[key] === 'object' && obj[key] !== null && 'value' in obj[key]) {
                    obj[key].value = val;
                } else {
                    obj[key] = val;
                }
            }
        }
        if (obj.birthdate) {
            obj.birthdate.year = 1990;
            obj.birthdate.day = 1;
            obj.birthdate.month = 1;
        }
        for (const key in obj) {
            if (key !== 'window' && obj[key] && typeof obj[key] === 'object') {
                patch(obj[key]);
            }
        }
    };

    let stateVal;
    Object.defineProperty(window, '__INITIAL_STATE__', {
        get: () => stateVal,
        set: (v) => {
            patch(v);
            stateVal = v;
        },
        configurable: true
    });

    const origParse = JSON.parse;
    JSON.parse = function () {
        const res = origParse.apply(this, arguments);
        if (res && typeof res === 'object') patch(res);
        return res;
    };
})();