# 🛡️ AgebypassX – Webpack Edition v1.3.0  
Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

AgebypassX v1.3.0 uses **modern webpack chunk interception** to work with X.com's latest architecture. It works **100% locally** in your browser, doesn't collect data, send requests to external servers, or modify your account.  
Your browsing experience remains **fully private**.

> **⚠️ Important Notice**  
> - You **must use a VPN** and set your **country outside of the UK**.  
> - **Ensure your DNS is not resolving through the UK** — it should be **managed by your VPN**.  
> - **Clear your cookies** and **log out of your X/Twitter session** in the browser **before enabling the script**.  
> - Only tested and verified on **Chromium-based browsers** (e.g., Chrome, Edge, Brave, Opera).  

---

## 🚀 Quick Setup Guide (Recommended)
1. **Enable a VPN** and set your location **outside of the UK**.  
2. Verify your **DNS is also handled by the VPN** — avoid UK-based DNS servers.  
3. **Log out** of your X/Twitter account.  
4. **Clear cookies and cache** in your browser for X/Twitter.  
5. Install **Tampermonkey** (if not already installed).  
6. Install the **AgebypassX** userscript.  
7. Reopen X/Twitter — the **green indicator dot** should appear if everything is set up correctly. ✅  

---

## ✨ Features v1.3.0
- ✅ **Modern webpack chunk interception** → Works with X.com's latest architecture  
- ✅ **Bypass age restrictions** on X/Twitter  
- ✅ **Always enable sensitive media viewing** (adult, violent, other content)  
- ✅ **Enhanced status tracking** → Detailed statistics and debug information  
- ✅ **Privacy-first** → No tracking, no external requests, no data collection  
- ✅ **Lightweight & fast** → Pure JavaScript, optimized for performance  
- ✅ **Advanced status indicator** → Animated states (pending/active/failed)  
- ✅ **Rich tooltip** → Shows intercepts, patches, webpack status, and last activity  
- ✅ **Network request fallback** → GraphQL query interception as backup method  
- ✅ **Debug API** → `window.AgebypassX` for advanced troubleshooting  

---

## 🔒 Privacy Matters
Unlike other bypass scripts, **AgebypassX**:
- **Does NOT** send your data anywhere.
- **Does NOT** modify your account or cookies.
- **Does NOT** include analytics, ads, or tracking.
- Everything runs **locally** via Tampermonkey.

Your privacy stays protected. 🛡️

---

## 📸 How It Works v1.3.0
Once installed, a small **animated dot** appears at the top-right of the page:
- 🟠 **Orange Dot (Pulsing)** → Script is **initializing** and searching for webpack chunks  
- 🟢 **Green Dot** → Script is **active** and successfully patched sensitive media settings ✅  
- 🔴 **Red Dot** → Failed to hook webpack or find sensitive media modules ❌  

**Enhanced Tooltip** (hover over dot):
- Shows **AgebypassX v1.3.0** version info
- **Status**: Active/Failed with detailed reason
- **Webpack**: Hook status (Hooked/Not hooked)  
- **Intercepts**: Number of webpack chunks intercepted
- **Patches**: Number of successful patches applied
- **Last**: Timestamp of most recent patch

**Debug Console** (for troubleshooting):
```javascript
// Enable debug logging
window.AgebypassX.config.debug = true;

// Check current status
window.AgebypassX.state;

// Force webpack re-check
window.AgebypassX.forceWebpackCheck();
```

---

## 🛠️ Troubleshooting v1.3.0

### Basic Issues
- If the indicator dot is **red**, reload the page and check console for errors
- Ensure Tampermonkey is **enabled** and script is **active**
- Use a **VPN** and set your location **outside of the UK**
- Make sure your **DNS is handled by the VPN** — avoid UK-based DNS
- **Clear your cookies** and **log out** of your X/Twitter session before enabling the script
- Tested only on **Chromium-based browsers** — other browsers may not work

### Advanced Debugging (v1.3.0)
1. **Enable Debug Mode**:
   ```javascript
   // In browser console on X.com
   window.AgebypassX.config.debug = true;
   ```

2. **Check Status**:
   ```javascript
   // View detailed status
   console.log(window.AgebypassX.state);
   ```

3. **Common Issues**:
   - **"Webpack: Not hooked"** → X.com's webpack chunks not found (try refreshing)
   - **"Intercepts: 0"** → No webpack chunks being loaded (check if logged in)
   - **"Patches: 0"** → Sensitive media modules not found (X.com may have changed structure)

4. **Force Re-check**:
   ```javascript
   // Manually trigger webpack hook attempt
   window.AgebypassX.forceWebpackCheck();
   ```

### Reporting Issues
For bug reports, [**open a GitHub issue**](https://github.com/Saganaki22/AgebypassX/issues) and include:
- Browser version and type
- Console error messages (with debug enabled)
- Screenshot of status tooltip

---

## 🧑‍💻 Source Code
Open-source and fully transparent:  
🔗 [https://github.com/Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX)

---

## 📜 License
Licensed under the [MIT License](https://opensource.org/licenses/MIT).  
Free to audit, fork, and improve.

---

## ⭐ Support
💡 Have feedback, feature requests, or just want to support the project?  
Visit the GitHub repository:  
🔗 **[https://github.com/Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX)**

---

## 🔄 Version History

### v1.3.0 (Latest) - Webpack Edition
- **🆕 Modern Architecture**: Completely rewritten to use webpack chunk interception
- **🎯 Enhanced Detection**: Targets `SensitiveMediaSettingsQuery` and related modules
- **📊 Advanced Status**: Detailed statistics, debug API, and enhanced tooltips
- **🔧 Multiple Fallbacks**: Network request hooking and GraphQL query interception
- **🎨 Better UI**: Animated status indicator with rich hover information
- **🐛 Improved Debugging**: Console API and comprehensive error reporting

### v1.2 - Enhanced Edition  
- Configuration system and state management
- Multiple patching strategies and UI improvements
- Privacy warning removal and SPA navigation handling

### v1.1 - Reliability Update
- Added fallback methods and enhanced error handling
- Multiple patch targets for better coverage

### v1.0 - Original
- Basic age bypass functionality with simple status indicator
