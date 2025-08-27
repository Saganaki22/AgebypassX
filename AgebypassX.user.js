// ==UserScript==
// @name         AgebypassX – Tampermonkey Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      1.3
// @description  Bypass Twitter/X age restrictions and always allow sensitive media viewing — fully privacy-friendly and secure.
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
// ==/UserScript==

(function() {
    'use strict';

    var style = document.createElement('style');
    style.textContent = '#agebypassx-indicator{position:fixed;top:20px;right:20px;width:16px;height:16px;border-radius:50%;z-index:9999999;transition:all 0.2s ease;pointer-events:auto;cursor:pointer;border:2px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.3)}#agebypassx-indicator[data-state="ok"]{background:#00ff66;box-shadow:0 0 15px #00ff66}#agebypassx-indicator[data-state="err"]{background:#ff3333;box-shadow:0 0 15px #ff3333}#agebypassx-tooltip{position:fixed;padding:8px 12px;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;color:#fff;background:#000;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.4);pointer-events:none;opacity:0;transform:translateY(-8px);transition:all 0.2s ease;z-index:9999999;border:1px solid #333}';
    document.documentElement.appendChild(style);

    var dot = document.createElement('div');
    dot.id = 'agebypassx-indicator';
    dot.dataset.state = 'ok';
    dot.title = 'AgebypassX Status';
    document.documentElement.appendChild(dot);

    var tooltip = document.createElement('div');
    tooltip.id = 'agebypassx-tooltip';
    document.documentElement.appendChild(tooltip);

    dot.addEventListener('mouseenter', function() {
        tooltip.textContent = 'AgebypassX: ' + (dot.dataset.state === 'ok' ? 'ACTIVE' : 'INACTIVE');
        var rect = dot.getBoundingClientRect();
        tooltip.style.left = rect.left - 60 + 'px';
        tooltip.style.top = rect.top + 25 + 'px';
        tooltip.style.opacity = 1;
        tooltip.style.transform = 'translateY(0)';
    });

    dot.addEventListener('mouseleave', function() {
        tooltip.style.opacity = 0;
        tooltip.style.transform = 'translateY(-8px)';
    });

    dot.addEventListener('click', function() {
        console.log('AgebypassX Status:', dot.dataset.state === 'ok' ? 'Working' : 'Error');
        alert('AgebypassX is ' + (dot.dataset.state === 'ok' ? 'ACTIVE' : 'INACTIVE'));
    });

    var value;
    var ok = true;

    console.log('AgebypassX: Script loaded and running');

    try {
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,
            set: function(newValue) {
                try {
                    if (newValue && newValue.featureSwitch && newValue.featureSwitch.customOverrides) {
                        newValue.featureSwitch.customOverrides.rweb_age_assurance_flow_enabled = false;
                        console.log('AgebypassX: Successfully disabled age assurance flow');
                    }
                } catch (e) {
                    console.warn('AgebypassX: Could not modify featureSwitch', e);
                    ok = false;
                }
                value = newValue;

                var dotElement = document.getElementById('agebypassx-indicator');
                if (dotElement) {
                    dotElement.dataset.state = ok ? 'ok' : 'err';
                }
            },
            get: function() {
                return value;
            }
        });
        console.log('AgebypassX: Property descriptor set successfully');
    } catch (e) {
        console.error('AgebypassX: Failed to set up property descriptor', e);
        ok = false;
        var dotElement = document.getElementById('agebypassx-indicator');
        if (dotElement) {
            dotElement.dataset.state = 'err';
        }
    }
})();
