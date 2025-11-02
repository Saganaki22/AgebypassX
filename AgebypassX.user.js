// ==UserScript==
// @name         AgebypassX – Webpack Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.0.0
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

(function () {
    'use strict';

    // Status indicator
    const style = document.createElement('style');
    style.textContent = '#agebypassx-indicator{position:fixed;top:20px;right:20px;width:16px;height:16px;border-radius:50%;background:#00ff66;border:2px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.3);z-index:9999999;cursor:pointer;transition:all 0.2s ease}#agebypassx-indicator[data-state="ok"]{background:#00ff66;box-shadow:0 0 15px #00ff66}#agebypassx-indicator[data-state="err"]{background:#ff3333;box-shadow:0 0 15px #ff3333}';
    document.documentElement.appendChild(style);

    const dot = document.createElement('div');
    dot.id = 'agebypassx-indicator';
    dot.dataset.state = 'ok';
    dot.title = 'AgebypassX: ACTIVE';
    document.documentElement.appendChild(dot);

    let value;
    let ok = true;

    console.log('[AgebypassX] Simple Edition: Script loaded and running');

    // Main state interception
    try {
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,
            set: function (newValue) {
                try {
                    if (newValue && newValue.featureSwitch && newValue.featureSwitch.customOverrides) {
                        newValue.featureSwitch.customOverrides.rweb_age_assurance_flow_enabled = false;
                        console.log('[AgebypassX] Successfully disabled age assurance flow');
                    }
                } catch (e) {
                    console.warn('[AgebypassX] Could not modify featureSwitch', e);
                    ok = false;
                }
                value = newValue;

                // Update indicator
                const dotElement = document.getElementById('agebypassx-indicator');
                if (dotElement) {
                    dotElement.dataset.state = ok ? 'ok' : 'err';
                    dotElement.title = 'AgebypassX: ' + (ok ? 'ACTIVE' : 'ERROR');
                }
            },
            get: function () {
                return value;
            }
        });
        console.log('[AgebypassX] Property descriptor set successfully');
    } catch (e) {
        console.error('[AgebypassX] Failed to set up property descriptor', e);
        ok = false;
        const dotElement = document.getElementById('agebypassx-indicator');
        if (dotElement) {
            dotElement.dataset.state = 'err';
            dotElement.title = 'AgebypassX: ERROR';
        }
    }

    // Additional hook for dynamic state changes
    const originalAssign = Object.assign;
    Object.assign = function(target, ...sources) {
        const result = originalAssign.apply(this, arguments);

        if (target && target.featureSwitch && target.featureSwitch.customOverrides) {
            target.featureSwitch.customOverrides.rweb_age_assurance_flow_enabled = false;
            console.log('[AgebypassX] Patched featureSwitch via Object.assign');
        }

        return result;
    };

    // Click handler for status indicator
    dot.addEventListener('click', function () {
        alert('AgebypassX Simple Edition v2.0.0\nStatus: ' + (ok ? 'ACTIVE' : 'ERROR') + '\n\nMethod: __INITIAL_STATE__ interception\nThis simple version directly patches Twitter\'s age verification settings.');
    });

    console.log('[AgebypassX] Simple Edition: Initialization complete');
})();
