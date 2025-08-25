// ==UserScript==
// @name         AgebypassX – Tampermonkey Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      1.1
// @description  Bypass Twitter/X age restrictions and always allow sensitive media viewing — fully privacy-friendly and secure.
// @author       Saganaki22
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Saganaki22/AgebypassX
// @supportURL   https://github.com/Saganaki22/AgebypassX/issues
// ==/UserScript==
 
(function () {
    'use strict';
 
    /* ---------- 1. Inject styles ---------- */
    const style = document.createElement('style');
    style.textContent = `
        #agebypassx-indicator {
            position: fixed;
            top: 12px;
            right: 12px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            z-index: 999999;
            transition: background 0.2s ease-in-out, box-shadow 0.2s;
            pointer-events: auto;
            cursor: pointer;
        }
        #agebypassx-indicator[data-state="ok"] {
            background: #00ff66;
            box-shadow: 0 0 8px #00ff66;
        }
        #agebypassx-indicator[data-state="err"] {
            background: #ff3333;
            box-shadow: 0 0 8px #ff3333;
        }
        /* Tooltip styling */
        #agebypassx-tooltip {
            position: fixed;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 500;
            font-family: Arial, sans-serif;
            color: #fff;
            background: rgba(0, 0, 0, 0.85);
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
            pointer-events: none;
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
            z-index: 999999;
        }
    `;
    document.documentElement.appendChild(style);
 
    /* ---------- 2. Create the dot ---------- */
    const dot = document.createElement('div');
    dot.id = 'agebypassx-indicator';
    dot.dataset.state = 'ok'; // Default assumption
    document.documentElement.appendChild(dot);
 
    /* ---------- 3. Create custom tooltip ---------- */
    const tooltip = document.createElement('div');
    tooltip.id = 'agebypassx-tooltip';
    document.documentElement.appendChild(tooltip);
 
    /* ---------- 4. Tooltip behavior ---------- */
    dot.addEventListener('mouseenter', () => {
        tooltip.textContent = dot.dataset.state === 'ok' ? 'ACTIVE' : 'INACTIVE';
        const rect = dot.getBoundingClientRect();
        tooltip.style.left = rect.left - 40 + 'px';
        tooltip.style.top = rect.top + 20 + 'px';
        tooltip.style.opacity = 1;
        tooltip.style.transform = 'translateY(0)';
    });
 
    dot.addEventListener('mouseleave', () => {
        tooltip.style.opacity = 0;
        tooltip.style.transform = 'translateY(-4px)';
    });
 
    /* ---------- 5. Inject the patch ---------- */
    const patchScript = document.createElement('script');
    patchScript.textContent = `
        (function () {
            let value;
            let ok = true;
 
            try {
                Object.defineProperty(window, '__INITIAL_STATE__', {
                    configurable: true,
                    enumerable: true,
                    set(newValue) {
                        try {
                            newValue.featureSwitch.customOverrides['rweb_age_assurance_flow_enabled'] = false;
                        } catch (e) {
                            ok = false;
                        }
                        value = newValue;
 
                        // Update indicator dynamically
                        const dot = document.getElementById('agebypassx-indicator');
                        if (dot) {
                            dot.dataset.state = ok ? 'ok' : 'err';
                        }
                    },
                    get() { return value; }
                });
            } catch (e) {
                ok = false;
                const dot = document.getElementById('agebypassx-indicator');
                if (dot) dot.dataset.state = 'err';
            }
        })();
    `;
    document.documentElement.appendChild(patchScript);
    patchScript.remove();
})();
