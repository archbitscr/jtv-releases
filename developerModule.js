const nativeApi = window.jtvAPI;

let devModeAvailable = false;
let developerModeEnabled = true;
let diagnosticsEnabled = false;
let showDiagnosticClicks = false;
let hudDevControlsEnabled = false;
let activeCrudChannelIndex = -1;
const crudScrollbarHideTimers = new WeakMap();

let originalCrudData = { name: '', id: '', path: '', logo: '', categories: '' };

function checkCrudFormDirty() {
    const nameInput = document.getElementById('crud-name-input');
    const idInput = document.getElementById('crud-id-input');
    const streamInput = document.getElementById('crud-stream-input');
    const logoInput = document.getElementById('crud-logo-input');
    const categoriesInput = document.getElementById('crud-categories-input');

    const name = (nameInput?.value || '').trim();
    const id = (idInput?.value || '').trim();
    const path = (streamInput?.value || '').trim();
    const logo = (logoInput?.value || '').trim();
    const categories = (categoriesInput?.value || '').trim();

    const indexVal = document.getElementById('crud-channel-index')?.value;
    const isNew = indexVal === '' || parseInt(indexVal, 10) === -1;

    let isDirty = false;
    if (isNew) {
        isDirty = name !== '' || id !== '' || path !== '' || logo !== '' || (categories !== 'all' && categories !== '');
    } else {
        isDirty = name !== originalCrudData.name ||
                  id !== originalCrudData.id ||
                  path !== originalCrudData.path ||
                  logo !== originalCrudData.logo ||
                  categories !== originalCrudData.categories;
    }

    const saveBtn = document.getElementById('crud-save-btn');
    if (saveBtn) {
        if (isDirty) {
            saveBtn.classList.add('pending-save');
        } else {
            saveBtn.classList.remove('pending-save');
        }
    }
}


window.getDeveloperState = () => {
    return {
        developerModeEnabled,
        diagnosticsEnabled,
        showDiagnosticClicks,
        hudDevControlsEnabled
    };
};

window.setDeveloperState = (savedData) => {
    developerModeEnabled = savedData.developerModeEnabled !== undefined ? !!savedData.developerModeEnabled : true;
    diagnosticsEnabled = !!savedData.diagnosticsEnabled;
    showDiagnosticClicks = !!savedData.showDiagnosticClicks;
    hudDevControlsEnabled = !!savedData.hudDevControlsEnabled;
    updateDeveloperUI();
};

export async function initDeveloperFeatures() {
    const powerOffBtn = document.getElementById('power-off-btn');
    if (powerOffBtn) {
        powerOffBtn.onclick = () => {
            console.log('[DeveloperModule] Clicked "Shut Down" button. Closing application...');
            window.close();
        };
    }

    const powerUserBtn = document.getElementById('power-user-btn');
    if (powerUserBtn) {
        powerUserBtn.onclick = () => window.close();
    }

    try {
        const flags = await nativeApi.getAppFlags();
        devModeAvailable = !!flags?.devModeAvailable;
    } catch (e) {
        devModeAvailable = false;
    }

    if (!devModeAvailable) return;

    // 1. Inject Developer Tab Button
    const tabsContainer = document.querySelector('.settings-tabs');
    if (!tabsContainer) return;

    const devTabBtn = document.createElement('button');
    devTabBtn.className = 'settings-tab-btn';
    devTabBtn.id = 'settings-tab-developer';
    devTabBtn.dataset.settingsTab = 'developer';
    devTabBtn.innerHTML = '<i data-lucide="code-2"></i> Developer <span class="dev-indicator"></span>';
    const parentalTab = document.getElementById('settings-tab-parental');
    if (parentalTab && parentalTab.nextSibling) {
        tabsContainer.insertBefore(devTabBtn, parentalTab.nextSibling);
    } else {
        tabsContainer.appendChild(devTabBtn);
    }

    // Move Channels tab right after the Developer tab
    const channelsTab = document.getElementById('settings-tab-channels');
    if (channelsTab && devTabBtn.nextSibling) {
        tabsContainer.insertBefore(channelsTab, devTabBtn.nextSibling);
    } else if (channelsTab) {
        tabsContainer.appendChild(channelsTab);
    }

    // 2. Inject developer mode toggle in General tab pane (at the end)
    const generalPane = document.getElementById('settings-sect-general');
    if (generalPane) {
        const devModeDivider = document.createElement('div');
        devModeDivider.className = 'setting-divider';
        generalPane.appendChild(devModeDivider);

        const devModeItem = document.createElement('div');
        devModeItem.className = 'setting-item';
        devModeItem.innerHTML = `
            <div class="setting-item-info">
                <span class="setting-title">Developer Mode</span>
                <span class="setting-desc">Enables internal debugging tools and development tabs.</span>
            </div>
            <label class="settings-switch">
                <input type="checkbox" id="developer-mode-toggle">
                <span class="settings-switch-slider"></span>
            </label>
        `;
        generalPane.appendChild(devModeItem);
    }

    // 2b. Inject Developer Section Pane
    const mainContainer = document.querySelector('.settings-main-content') || document.querySelector('.settings-main');
    if (!mainContainer) return;

    const devPane = document.createElement('div');
    devPane.id = 'settings-sect-developer';
    devPane.className = 'settings-sect-pane';
    devPane.innerHTML = `
        <h3 class="settings-page-title">Developer Mode</h3>
        <nav class="settings-subnav" aria-label="Developer sections">
            <button class="settings-subnav-btn dev-subnav-btn active" data-dev-tab="dev-tab-general"><i data-lucide="settings"></i> General</button>
            <button class="settings-subnav-btn dev-subnav-btn" data-dev-tab="dev-tab-timeouts"><i data-lucide="timer"></i> Timeouts</button>
        </nav>
        <div id="dev-tab-general" class="dev-tab-pane">
        <div class="setting-item">
            <div class="setting-item-info">
                <span class="setting-title">Glass Tuner</span>
                <span class="setting-desc">Visual tool to adjust HUD, Sidebar, and Top Nav glassmorphism in real time.</span>
            </div>
            <label class="settings-switch">
                <input type="checkbox" id="glass-tuner-toggle">
                <span class="settings-switch-slider"></span>
            </label>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item">
            <div class="setting-item-info">
                <span class="setting-title">Signal & Source Controls</span>
                <span class="setting-desc">Show autotuner and channel source switcher in the bottom menu.</span>
            </div>
            <label class="settings-switch">
                <input type="checkbox" id="hud-dev-controls-toggle">
                <span class="settings-switch-slider"></span>
            </label>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item">
            <div class="setting-item-info">
                <span class="setting-title">Tools</span>
                <span class="setting-desc">Quick debugging actions.</span>
            </div>
            <div class="setting-item-actions">
                <button id="open-devtools-btn" class="settings-action-btn">Open DevTools</button>
            </div>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item">
            <div class="setting-item-info">
                <span class="setting-title">Diagnostics Watchers</span>
                <span class="setting-desc">Activates diagnostic watchers (eval.tmp, take-screenshot.tmp, and audio detector).</span>
            </div>
            <label class="settings-switch">
                <input type="checkbox" id="diagnostics-toggle">
                <span class="settings-switch-slider"></span>
            </label>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item">
            <div class="setting-item-info">
                <span class="setting-title">Click Indicator</span>
                <span class="setting-desc">Shows a red visual circle at each mouse click coordinate.</span>
            </div>
            <label class="settings-switch">
                <input type="checkbox" id="diagnostic-clicks-toggle">
                <span class="settings-switch-slider"></span>
            </label>
        </div>
        </div>
        <div id="dev-tab-timeouts" class="dev-tab-pane" style="display: none;">
            <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 15px;">Manually configure or disable system timeouts and watchdog (in milliseconds).</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <!-- Grupo 1: Settings Panel -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Settings Panel</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Settings active -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Settings active (With Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Closes settings during playback.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-settings-active" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-settings-active-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Settings inactive -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Settings inactive (No Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Closes settings when idle.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-settings-inactive" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-settings-inactive-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grupo 2: Side Menu -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Side Menu</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Menu active -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Side menu active (With Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Closes menu during playback.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-menu-active" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-menu-active-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Menu inactive -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Side menu inactive (No Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Closes menu when idle.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-menu-inactive" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-menu-inactive-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grupo 3: Bottom Menu (HUD) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Bottom Menu (HUD)</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Zapping HUD -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Hide Zapping HUD</span>
                                <span class="setting-desc" style="font-size: 11px;">Hides bottom info and source bar.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-zappinghud" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-zappinghud-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grupo 4: Top Menu (Navigation) -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Top Menu (Navigation)</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Top Nav -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Hide Top Menu</span>
                                <span class="setting-desc" style="font-size: 11px;">Hides top navigation bar.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-topnav" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-topnav-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grupo 5: Mouse Cursor -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Mouse Cursor</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Hide cursor active -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Hide Cursor (With Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Hides cursor during playback.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-cursor-active" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-cursor-active-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Hide cursor inactive -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Hide Cursor (No Stream)</span>
                                <span class="setting-desc" style="font-size: 11px;">Hides cursor when idle.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-cursor-inactive" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-cursor-inactive-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Grupo 6: Failover & Watchdog -->
                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
                    <h5 style="font-size: 12px; color: #a5b4fc; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">Failover & Watchdog</h5>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- Failover Main -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Main Source Failover</span>
                                <span class="setting-desc" style="font-size: 11px;">Grace time before first retry.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-failover-main" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-failover-main-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- Failover Alt -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Alternate Sources Failover</span>
                                <span class="setting-desc" style="font-size: 11px;">Grace time per alternate source.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-failover-alt" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-failover-alt-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- Watchdog Freeze limit -->
                        <div class="setting-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0; border: none; margin: 0;">
                            <div class="setting-item-info">
                                <span class="setting-title" style="font-size: 13px;">Video Freeze Watchdog</span>
                                <span class="setting-desc" style="font-size: 11px;">Detects frozen currentTime in the player.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="number" id="timeout-watchdog-freeze" class="dark-input" style="width: 80px; margin: 0; padding: 4px 8px; text-align: center; height: 30px; font-size: 13px;">
                                <label class="settings-switch">
                                    <input type="checkbox" id="timeout-watchdog-freeze-enabled">
                                    <span class="settings-switch-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    mainContainer.appendChild(devPane);

    // Developer subtab switching
    devPane.querySelectorAll('.dev-subnav-btn').forEach(btn => {
        btn.onclick = () => {
            devPane.querySelectorAll('.dev-subnav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            devPane.querySelectorAll('.dev-tab-pane').forEach(p => p.style.display = 'none');
            const target = document.getElementById(btn.dataset.devTab);
            if (target) target.style.display = '';
        };
    });

    // 2b. Inject Channels CRUD Section Pane
    const devChannelsPane = document.getElementById('developer-channels-crud-container');
    if (devChannelsPane) {
        devChannelsPane.innerHTML = `
            <div class="channels-crud-container" style="display: flex; gap: 20px; flex: 1; min-height: 0; overflow: hidden; align-items: stretch;">
                <!-- Left: list of channels -->
                <div class="crud-list-panel" style="flex: 1; border-right: 1px solid rgba(255,255,255,0.08); padding-right: 15px; display: flex; flex-direction: column; min-height: 0; height: 100%;">
                    <div class="crud-list-header" style="margin-bottom: 12px; display: flex; gap: 10px;">
                        <input type="search" id="crud-search" class="dark-input" placeholder="Filtrar..." style="margin: 0; padding: 6px 10px; flex: 1;">
                        <button id="crud-add-new-btn" class="settings-action-btn" style="margin: 0; white-space: nowrap;">+ New</button>
                    </div>
                    <div id="crud-channels-list" class="crud-scroll-panel" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 5px;">
                        <!-- Populated dynamically -->
                    </div>
                </div>
                <!-- Right: edit/add form -->
                <div class="crud-form-panel crud-scroll-panel" style="flex: 1; overflow-y: auto; padding-left: 5px; min-height: 0; height: 100%; display: flex; flex-direction: column;">
                    <div id="crud-form-empty-message" style="color: rgba(255,255,255,0.4); text-align: center; margin-top: 60px;">
                        Select a channel from the list or press "+ New" to edit
                    </div>
                    <div id="crud-channel-form" class="hidden" style="display: flex; flex-direction: column; gap: 14px; padding-bottom: 20px;">
                        <input type="hidden" id="crud-channel-index">
                        
                        <!-- 1. Name -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:5px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Channel Name</label>
                            <input type="text" id="crud-name-input" class="dark-input" placeholder="Ej. HBO USA" style="margin:0;">
                        </div>
                        
                        <!-- 2. Number ID -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:5px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Number / ID</label>
                            <input type="text" id="crud-id-input" class="dark-input" placeholder="Ej. 101" style="margin:0;">
                        </div>
                        
                        <!-- 3. Stream URL -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:5px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Stream URL (Source 1)</label>
                            <input type="text" id="crud-stream-input" class="dark-input" placeholder="Main URL" style="margin:0;">
                        </div>
                        
                        <!-- 4. Signal -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:5px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Signal</label>
                            <div style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 6px 12px; height: 36px; align-self: flex-start;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.5);">Video:</span>
                                    <span id="crud-signal-video-status" class="autotune-dot checking"></span>
                                    <span id="crud-signal-video-text" style="font-size: 13px; font-weight: 500;">Checking...</span>
                                </div>
                                <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.1);"></div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 11px; color: rgba(255,255,255,0.5);">Audio:</span>
                                    <span id="crud-signal-audio-status" class="autotune-dot checking"></span>
                                    <span id="crud-signal-audio-text" style="font-size: 13px; font-weight: 500;">Checking...</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 5. Filters / Categories -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:5px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Categories (comma-separated)</label>
                            <input type="text" id="crud-categories-input" class="dark-input" placeholder="Ej. sports, live, all" style="margin:0;">
                        </div>
                        
                        <!-- 6. Channel Logo (80px size, no placeholder when empty) -->
                        <div class="edit-group" style="display:flex; flex-direction:column; gap:8px;">
                            <label style="font-size:12px; color:rgba(255,255,255,0.6)">Channel Logo</label>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <div id="crud-logo-preview-container" style="width: 80px; height: 80px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                                    <img id="crud-logo-preview" style="max-width: 100%; max-height: 100%; object-fit: contain; display: none;">
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                                    <input type="text" id="crud-logo-input" class="dark-input" placeholder="Ej. https://... o base64" style="margin:0; width: 100%;">
                                    <div style="display: flex; gap: 8px;">
                                        <button type="button" id="crud-logo-upload-btn" class="settings-action-btn" style="margin: 0; padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                                            <i data-lucide="upload" style="width: 14px; height: 14px;"></i> Upload Image
                                        </button>
                                        <button type="button" id="crud-logo-delete-btn" class="danger-btn" style="margin: 0; padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;">
                                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                                        </button>
                                        <input type="file" id="crud-logo-file-input" accept="image/*" style="display: none;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 7. Save / Delete Buttons -->
                        <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px;">
                            <button type="button" id="crud-save-btn" class="settings-action-btn" style="flex: 1; padding: 10px 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600;">
                                <i data-lucide="save" style="width: 16px; height: 16px;"></i> Save Channel
                            </button>
                            <button type="button" id="crud-delete-btn" class="danger-btn" style="flex: 1; padding: 10px 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444;">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Delete Channel
                            </button>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

    bindCrudScrollbarActivity();

    const nameInput = document.getElementById('crud-name-input');
    const idInput = document.getElementById('crud-id-input');
    const streamInput = document.getElementById('crud-stream-input');
    const logoInput = document.getElementById('crud-logo-input');
    const categoriesInput = document.getElementById('crud-categories-input');

    if (nameInput) nameInput.oninput = checkCrudFormDirty;
    if (idInput) idInput.oninput = checkCrudFormDirty;
    if (streamInput) streamInput.oninput = checkCrudFormDirty;
    if (logoInput) logoInput.oninput = checkCrudFormDirty;
    if (categoriesInput) categoriesInput.oninput = checkCrudFormDirty;

    // 3. Tab switching is handled by the delegated listener in
    // eventListeners.js (.settings-tabs container), which covers this
    // dynamically-injected tab too. No per-button handler needed here.

    // 4. Wire up event listeners
    const developerModeToggle = document.getElementById('developer-mode-toggle');
    if (developerModeToggle) {
        developerModeToggle.onchange = async (e) => {
            if (!devModeAvailable) {
                e.target.checked = false;
                return;
            }
            developerModeEnabled = !!e.target.checked;

            if (!developerModeEnabled) {
                diagnosticsEnabled = false;
                showDiagnosticClicks = false;
                try {
                    await nativeApi.setDiagnosticsEnabled(false);
                } catch (e2) {}
            }

            updateDeveloperUI();
            if (window.saveAppState) {
                window.saveAppState();
            }
        };
    }

    const diagnosticsToggle = document.getElementById('diagnostics-toggle');
    if (diagnosticsToggle) {
        diagnosticsToggle.onchange = async (e) => {
            if (!devModeAvailable || !developerModeEnabled) {
                e.target.checked = false;
                return;
            }
            diagnosticsEnabled = !!e.target.checked;

            let res;
            try {
                res = await nativeApi.setDiagnosticsEnabled(diagnosticsEnabled);
            } catch (err) {
                res = { error: err.message };
            }

            if (res && res.error) {
                diagnosticsEnabled = false;
            }

            updateDeveloperUI();
            if (window.saveAppState) {
                window.saveAppState();
            }
        };
    }

    const clickDiagToggle = document.getElementById('diagnostic-clicks-toggle');
    if (clickDiagToggle) {
        clickDiagToggle.onchange = (e) => {
            if (!devModeAvailable || !developerModeEnabled) {
                e.target.checked = false;
                return;
            }
            showDiagnosticClicks = !!e.target.checked;
            updateDeveloperUI();
            if (window.saveAppState) {
                window.saveAppState();
            }
        };
    }

    const hudDevToggle = document.getElementById('hud-dev-controls-toggle');
    if (hudDevToggle) {
        hudDevToggle.onchange = (e) => {
            if (!devModeAvailable || !developerModeEnabled) {
                e.target.checked = false;
                return;
            }
            hudDevControlsEnabled = !!e.target.checked;
            updateDeveloperUI();
            if (window.saveAppState) {
                window.saveAppState();
            }
        };
    }

    const openDevtoolsBtn = document.getElementById('open-devtools-btn');
    if (openDevtoolsBtn) {
        openDevtoolsBtn.onclick = async () => {
            console.log('[DeveloperModule] Clicked "Open DevTools". States:', { devModeAvailable, developerModeEnabled });
            if (!devModeAvailable || !developerModeEnabled) {
                console.warn('[DeveloperModule] Action ignored: developer mode is not active/available');
                return;
            }
            try {
                const res = await nativeApi.openDevtools();
                console.log('[DeveloperModule] DevTools IPC response:', res);
            } catch (e) {
                console.error('[DeveloperModule] Failed calling openDevtools:', e);
            }
        };
    }

    const reloadWindowBtn = document.getElementById('reload-window-btn');
    if (reloadWindowBtn) {
        reloadWindowBtn.onclick = async () => {
            console.log('[DeveloperModule] Clicked "Reload Window". States:', { devModeAvailable, developerModeEnabled });
            if (!devModeAvailable || !developerModeEnabled) {
                console.warn('[DeveloperModule] Action ignored: developer mode is not active/available');
                return;
            }
            try {
                const res = await nativeApi.reloadWindow();
                console.log('[DeveloperModule] Reload IPC response:', res);
            } catch (e) {
                console.error('[DeveloperModule] Failed calling reloadWindow:', e);
            }
        };
    }

    // 5. CRUD Panel bindings
    const crudSearch = document.getElementById('crud-search');
    if (crudSearch) {
        crudSearch.oninput = () => renderCrudChannelsList();
    }

    const crudAddNewBtn = document.getElementById('crud-add-new-btn');
    if (crudAddNewBtn) {
        crudAddNewBtn.onclick = () => selectCrudChannel(-1);
    }

    const crudSaveBtn = document.getElementById('crud-save-btn');
    if (crudSaveBtn) {
        crudSaveBtn.onclick = async () => {
            const index = parseInt(document.getElementById('crud-channel-index').value, 10);
            const name = document.getElementById('crud-name-input').value.trim();
            const id = document.getElementById('crud-id-input').value.trim();
            const path = document.getElementById('crud-stream-input').value.trim();
            const logo = document.getElementById('crud-logo-input').value.trim();
            const catsText = document.getElementById('crud-categories-input').value;

            if (!name || !id || !path) {
                alert('Name, ID, and Stream URL are required.');
                return;
            }

            let categories = catsText.split(',').map(s => s.trim()).filter(Boolean);
            if (!categories.includes('all')) {
                categories.push('all');
            }

            const channels = window.getChannels ? window.getChannels() : [];
            const originalCh = index >= 0 ? channels[index] : {};
            const newCh = { ...originalCh, name, id, path, logo, categories };

            if (index >= 0) {
                channels[index] = newCh;
            } else {
                channels.push(newCh);
            }

            if (window.setChannels) {
                window.setChannels(channels);
            }

            await window.saveAppState();
            window.renderAll();

            if (String(newCh.id) === String(window.state?.activeChannelId)) {
                if (window.updateHudChannelFilters) window.updateHudChannelFilters(newCh);
            }

            renderCrudChannelsList();
            selectCrudChannel(index >= 0 ? index : channels.length - 1);
        };
    }

    const crudDeleteBtn = document.getElementById('crud-delete-btn');
    if (crudDeleteBtn) {
        crudDeleteBtn.onclick = async () => {
            const index = parseInt(document.getElementById('crud-channel-index').value, 10);
            if (index < 0) return;

            if (!confirm('Are you sure you want to delete this channel?')) return;

            const channels = window.getChannels ? window.getChannels() : [];
            channels.splice(index, 1);

            if (window.setChannels) {
                window.setChannels(channels);
            }

            await window.saveAppState();
            window.renderAll();

            activeCrudChannelIndex = -1;
            renderCrudChannelsList();
            
            const emptyMsg = document.getElementById('crud-form-empty-message');
            const form = document.getElementById('crud-channel-form');
            if (emptyMsg && form) {
                emptyMsg.style.display = 'block';
                form.classList.add('hidden');
            }
        };
    }

    // 6. Global click diagnostics listener
    document.addEventListener('mousedown', (e) => {
        if (!developerModeEnabled || !showDiagnosticClicks) return;
        const dot = document.createElement('div');
        dot.style.position = 'fixed';
        dot.style.left = (e.clientX - 10) + 'px';
        dot.style.top = (e.clientY - 10) + 'px';
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        dot.style.boxShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
        dot.style.pointerEvents = 'none';
        dot.style.zIndex = '999999';
        dot.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        dot.style.transform = 'scale(1)';
        document.body.appendChild(dot);
        setTimeout(() => {
            dot.style.opacity = '0';
            dot.style.transform = 'scale(0.2)';
        }, 50);
        setTimeout(() => {
            dot.remove();
        }, 900);
    });

    if (logoInput) {
        logoInput.addEventListener('input', (e) => {
            updateLogoPreview(e.target.value);
            checkCrudFormDirty();
        });
    }

    const logoUploadBtn = document.getElementById('crud-logo-upload-btn');
    const logoFileInput = document.getElementById('crud-logo-file-input');
    if (logoUploadBtn && logoFileInput) {
        logoUploadBtn.onclick = () => {
            logoFileInput.click();
        };
        
        logoFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    if (logoInput) {
                        logoInput.value = dataUrl;
                        updateLogoPreview(dataUrl);
                        checkCrudFormDirty();
                    }
                };
                reader.readAsDataURL(file);
            }
            logoFileInput.value = '';
        };
    }

    const logoDeleteBtn = document.getElementById('crud-logo-delete-btn');
    if (logoDeleteBtn) {
        logoDeleteBtn.onclick = () => {
            if (logoInput) {
                logoInput.value = '';
                updateLogoPreview('');
                checkCrudFormDirty();
            }
        };
    }

    // 8. Bind Timeout controls
    const timeouts = window.timeoutsConfig || {};
    
    const bindTimeoutInput = (inputId, enabledId, configKey) => {
        const inputEl = document.getElementById(inputId);
        const switchEl = document.getElementById(enabledId);
        
        if (inputEl) {
            inputEl.value = timeouts[configKey] !== undefined ? timeouts[configKey] : 0;
            inputEl.oninput = async () => {
                const val = parseInt(inputEl.value, 10);
                if (!isNaN(val)) {
                    timeouts[configKey] = val;
                    if (window.saveAppState) await window.saveAppState();
                    if (configKey === 'watchdogFreeze') {
                        if (window.sendWatchdogConfig) window.sendWatchdogConfig();
                    }
                }
            };
        }
        
        if (switchEl) {
            switchEl.checked = timeouts[configKey + 'Enabled'] !== undefined ? timeouts[configKey + 'Enabled'] : true;
            switchEl.onchange = async () => {
                timeouts[configKey + 'Enabled'] = !!switchEl.checked;
                if (window.saveAppState) await window.saveAppState();
                if (configKey === 'watchdogFreeze') {
                    if (window.sendWatchdogConfig) window.sendWatchdogConfig();
                }
            };
        }
    };

    bindTimeoutInput('timeout-settings-active', 'timeout-settings-active-enabled', 'settingsActive');
    bindTimeoutInput('timeout-settings-inactive', 'timeout-settings-inactive-enabled', 'settingsInactive');
    bindTimeoutInput('timeout-menu-active', 'timeout-menu-active-enabled', 'menuActive');
    bindTimeoutInput('timeout-menu-inactive', 'timeout-menu-inactive-enabled', 'menuInactive');
    bindTimeoutInput('timeout-topnav', 'timeout-topnav-enabled', 'topNav');
    bindTimeoutInput('timeout-zappinghud', 'timeout-zappinghud-enabled', 'zappingHUD');
    bindTimeoutInput('timeout-cursor-active', 'timeout-cursor-active-enabled', 'cursorActive');
    bindTimeoutInput('timeout-cursor-inactive', 'timeout-cursor-inactive-enabled', 'cursorInactive');
    bindTimeoutInput('timeout-failover-main', 'timeout-failover-main-enabled', 'failoverMain');
    bindTimeoutInput('timeout-failover-alt', 'timeout-failover-alt-enabled', 'failoverAlt');
    bindTimeoutInput('timeout-watchdog-freeze', 'timeout-watchdog-freeze-enabled', 'watchdogFreeze');

    window.selectCrudChannel = selectCrudChannel;
    window.renderCrudChannelsList = renderCrudChannelsList;

    // Initial UI update
    updateDeveloperUI();
}

function updateLogoPreview(url) {
    const previewImg = document.getElementById('crud-logo-preview');
    if (!previewImg) return;
    if (url && url.trim()) {
        previewImg.src = url.trim();
        previewImg.style.display = 'block';
    } else {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegex(value) {
    return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, term) {
    const safeText = escapeHtml(text);
    const safeTerm = escapeHtml(term);
    if (!safeTerm) return safeText;
    const regex = new RegExp(`(${escapeRegex(safeTerm)})`, 'gi');
    return safeText.replace(regex, '<span class="highlight">$1</span>');
}

function renderCrudChannelsList() {
    const listContainer = document.getElementById('crud-channels-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const filterVal = (document.getElementById('crud-search')?.value || '').toLowerCase();
    const rawList = window.getChannels ? window.getChannels() : [];
    const chList = [...rawList].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
    );

    chList.forEach((c, index) => {
        const originalIndex = rawList.indexOf(c);
        const num = c.id || (originalIndex + 1);
        const name = c.name || '';
        if (filterVal && !name.toLowerCase().includes(filterVal) && !String(num).includes(filterVal)) {
            return;
        }

        const formattedNum = isNaN(num) ? num : String(num).padStart(4, '0');
        const displayNum = highlightText(formattedNum, filterVal);
        const displayName = highlightText(name, filterVal);

        const item = document.createElement('div');
        item.className = 'crud-channel-item';
        item.dataset.channelIndex = String(originalIndex);
        if (originalIndex === activeCrudChannelIndex) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <span class="crud-channel-label"><span class="crud-channel-number">${displayNum}</span><span class="crud-channel-name">${displayName}</span></span>
        `;

        item.onclick = () => selectCrudChannel(originalIndex);
        listContainer.appendChild(item);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const activeItem = listContainer.querySelector('.crud-channel-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
    }
}

function selectCrudChannel(index) {
    activeCrudChannelIndex = index;
    renderCrudChannelsList();

    const emptyMsg = document.getElementById('crud-form-empty-message');
    const form = document.getElementById('crud-channel-form');
    if (!form || !emptyMsg) return;
    
    emptyMsg.style.display = 'none';
    form.classList.remove('hidden');
    bindCrudScrollbarActivity();
    
    const channels = window.getChannels ? window.getChannels() : [];
    const channel = index >= 0 ? channels[index] : { name: '', id: '', path: '', logo: '', categories: ['all'] };
    
    document.getElementById('crud-channel-index').value = index;
    document.getElementById('crud-name-input').value = channel.name || '';
    document.getElementById('crud-id-input').value = channel.id || '';
    document.getElementById('crud-stream-input').value = channel.path || '';
    document.getElementById('crud-logo-input').value = channel.logo || '';
    updateLogoPreview(channel.logo || '');
    document.getElementById('crud-categories-input').value = (channel.categories || []).join(', ');

    originalCrudData = {
        name: channel.name || '',
        id: channel.id || '',
        path: channel.path || '',
        logo: channel.logo || '',
        categories: (channel.categories || []).join(', ')
    };
    checkCrudFormDirty();

    const formPanel = document.querySelector('#developer-channels-crud-container .crud-form-panel');
    if (formPanel) {
        formPanel.scrollTop = 0;
        showCrudScrollbar(formPanel);
    }
    
    const videoDot = document.getElementById('crud-signal-video-status');
    const videoText = document.getElementById('crud-signal-video-text');
    const audioDot = document.getElementById('crud-signal-audio-status');
    const audioText = document.getElementById('crud-signal-audio-text');
    
    if (index >= 0 && channel.path) {
        runSignalCheck(channel.path, videoDot, videoText, audioDot, audioText);
    } else {
        if (videoDot && videoText && audioDot && audioText) {
            videoDot.className = 'autotune-dot checking';
            videoDot.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            videoText.innerText = 'No broadcast';
            audioDot.className = 'autotune-dot checking';
            audioDot.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            audioText.innerText = 'No broadcast';
        }
    }
}

function showCrudScrollbar(scrollEl) {
    if (!scrollEl) return;
    scrollEl.classList.add('scrollbar-active');

    const currentTimer = crudScrollbarHideTimers.get(scrollEl);
    if (currentTimer) {
        clearTimeout(currentTimer);
    }

    const nextTimer = setTimeout(() => {
        scrollEl.classList.remove('scrollbar-active');
        crudScrollbarHideTimers.delete(scrollEl);
    }, 1500);

    crudScrollbarHideTimers.set(scrollEl, nextTimer);
}

function bindCrudScrollbarActivity() {
    const scrollPanels = document.querySelectorAll('#developer-channels-crud-container .crud-scroll-panel');
    scrollPanels.forEach((scrollPanel) => {
        if (scrollPanel.dataset.scrollbarBound === 'true') return;

        scrollPanel.dataset.scrollbarBound = 'true';

        const handleActivity = () => showCrudScrollbar(scrollPanel);
        ['mouseenter', 'mousemove', 'wheel', 'scroll', 'touchstart'].forEach((eventName) => {
            scrollPanel.addEventListener(eventName, handleActivity, { passive: true });
        });
        scrollPanel.addEventListener('mouseleave', () => {
            const currentTimer = crudScrollbarHideTimers.get(scrollPanel);
            if (currentTimer) {
                clearTimeout(currentTimer);
            }
            const nextTimer = setTimeout(() => {
                scrollPanel.classList.remove('scrollbar-active');
                crudScrollbarHideTimers.delete(scrollPanel);
            }, 300);
            crudScrollbarHideTimers.set(scrollPanel, nextTimer);
        });

        showCrudScrollbar(scrollPanel);
    });
}

async function runSignalCheck(url, videoDot, videoText, audioDot, audioText) {
    if (!videoDot || !videoText || !audioDot || !audioText) return;
    
    videoDot.className = 'autotune-dot checking';
    videoDot.style.backgroundColor = '';
    videoText.innerText = 'Checking...';
    audioDot.className = 'autotune-dot checking';
    audioDot.style.backgroundColor = '';
    audioText.innerText = 'Checking...';
    
    try {
        const fullUrl = url.startsWith('http') ? url : `${window.globalDomain || 'https://dlhd.pk/'}${url}`;
        
        // Call the backend IPC to check status
        const res = await window.jtvAPI.checkChannelStatus(fullUrl);
        
        if (res && res.online) {
            // Video Status
            if (res.video) {
                videoDot.className = 'autotune-dot online';
                videoText.innerText = 'Active';
            } else {
                videoDot.className = 'autotune-dot offline';
                videoText.innerText = 'Inactive';
            }
            
            // Audio Status
            if (res.audio) {
                audioDot.className = 'autotune-dot online';
                audioText.innerText = 'Active';
            } else {
                audioDot.className = 'autotune-dot offline';
                audioText.innerText = 'Inactive';
            }
        } else {
            let reason = 'Offline';
            if (res && res.reason === 'stream_offline') {
                reason = 'Offline (Stream)';
            } else if (res && res.reason === 'http_error') {
                reason = `HTTP ${res.status}`;
            } else if (res && res.reason === 'exception') {
                reason = 'Error/Timeout';
            }
            
            videoDot.className = 'autotune-dot offline';
            videoText.innerText = reason;
            audioDot.className = 'autotune-dot offline';
            audioText.innerText = reason;
        }
    } catch (e) {
        videoDot.className = 'autotune-dot offline';
        videoText.innerText = 'Error';
        audioDot.className = 'autotune-dot offline';
        audioText.innerText = 'Error';
    }
}

export function updateDeveloperUI() {
    const devToggle = document.getElementById('developer-mode-toggle');
    const diagToggle = document.getElementById('diagnostics-toggle');
    const clickDiagToggle = document.getElementById('diagnostic-clicks-toggle');
    const openDevtoolsBtn = document.getElementById('open-devtools-btn');
    const reloadWindowBtn = document.getElementById('reload-window-btn');
    const powerOffBtn = document.getElementById('power-off-btn');
    const powerHoverZone = document.getElementById('power-hover-zone');

    console.log('[DeveloperModule] updateDeveloperUI: developerModeEnabled =', developerModeEnabled, 'reloadWindowBtn =', !!reloadWindowBtn, 'powerOffBtn =', !!powerOffBtn);

    if (devToggle) devToggle.checked = !!developerModeEnabled;
    const hudDevToggle = document.getElementById('hud-dev-controls-toggle');
    if (hudDevToggle) {
        hudDevToggle.checked = !!hudDevControlsEnabled;
        hudDevToggle.disabled = !developerModeEnabled;
    }
    if (diagToggle) {
        diagToggle.checked = !!diagnosticsEnabled;
        diagToggle.disabled = !developerModeEnabled;
    }
    if (clickDiagToggle) {
        clickDiagToggle.checked = !!showDiagnosticClicks;
        clickDiagToggle.disabled = !developerModeEnabled;
    }
    if (openDevtoolsBtn) openDevtoolsBtn.disabled = !developerModeEnabled;

    const appLoader = document.getElementById('app-loader');
    const onboardingModal = document.getElementById('onboarding-modal');
    const isLoaderVisible = appLoader && !appLoader.classList.contains('hidden');
    const isOnboardingVisible = onboardingModal && !onboardingModal.classList.contains('hidden');

    if (isLoaderVisible || isOnboardingVisible) {
        if (reloadWindowBtn) reloadWindowBtn.style.display = 'none';
        if (powerOffBtn) powerOffBtn.style.display = 'none';
        if (powerHoverZone) powerHoverZone.style.display = 'none';
    } else {
        if (developerModeEnabled) {
            if (reloadWindowBtn) reloadWindowBtn.style.display = 'flex';
            if (powerOffBtn) {
                powerOffBtn.style.display = 'flex';
                powerOffBtn.classList.remove('neon-white');
            }
            if (powerHoverZone) powerHoverZone.style.display = 'none';
        } else {
            if (reloadWindowBtn) reloadWindowBtn.style.display = 'none';
            if (powerOffBtn) powerOffBtn.style.display = 'none';
            if (powerHoverZone) powerHoverZone.style.display = 'flex';
        }
    }

    // Show/hide dev tabs (Tarea 27 + Filtros)
    const devTab = document.getElementById('settings-tab-developer');
    const connectivityTab = document.getElementById('settings-tab-connectivity');
    const sensorsTab = document.querySelector('[data-settings-tab="sensors"]');
    const channelsTab = document.getElementById('settings-tab-channels');
    const filtersTab = document.getElementById('settings-tab-filters');
    
    // Use '' (revert to stylesheet display:flex) to show, 'none' to hide.
    // Forcing 'block' here previously broke the button's flex layout
    // (icon + label misaligned, looked like plain text instead of a button).
    const displayStyle = developerModeEnabled ? '' : 'none';
    if (devTab) devTab.style.display = displayStyle;
    if (connectivityTab) connectivityTab.style.display = displayStyle;
    if (sensorsTab) sensorsTab.style.display = displayStyle;
    if (channelsTab) channelsTab.style.display = displayStyle;
    if (filtersTab) filtersTab.style.display = ''; // Always visible in user and dev mode

    const devChannelsCrud = document.getElementById('developer-channels-crud-container');
    if (devChannelsCrud) {
        devChannelsCrud.style.display = developerModeEnabled ? 'flex' : 'none';
        devChannelsCrud.style.flexDirection = 'column';
        devChannelsCrud.style.flex = '1 1 auto';
        devChannelsCrud.style.minHeight = '0';
        if (developerModeEnabled) {
            bindCrudScrollbarActivity();
        }
    }

    // Show/hide filter CRUD groups depending on developerModeEnabled (Tarea 29)
    const langCard = document.getElementById('group-card-language');
    const genreCard = document.getElementById('group-card-genre');
    const eventCard = document.getElementById('group-card-event');
    const listFilterEvents = document.getElementById('list-filter-events');
    const filtersGroupsContainer = document.querySelector('.filters-groups-container');

    if (filtersGroupsContainer) {
        filtersGroupsContainer.style.display = 'flex';
    }
    // Language: always visible; add-form only in dev mode
    if (langCard) {
        langCard.style.display = '';
        const langAddForm = langCard.querySelector('.filter-group-add-form');
        if (langAddForm) langAddForm.style.display = developerModeEnabled ? '' : 'none';
    }
    // Genre: always visible; add-form only in dev mode; read-only class in user mode
    if (genreCard) {
        genreCard.style.display = '';
        genreCard.classList.toggle('readonly-filter-group', !developerModeEnabled);
        const genreAddForm = genreCard.querySelector('.filter-group-add-form');
        if (genreAddForm) genreAddForm.style.display = developerModeEnabled ? '' : 'none';
    }
    if (eventCard) {
        eventCard.classList.remove('full-width-card');
        if (listFilterEvents) listFilterEvents.classList.remove('grid-3-columns');
    }

    // Assignment section: always visible (user sees Events only)
    const assignerSection = document.getElementById('filters-assigner-section');
    if (assignerSection) {
        assignerSection.style.display = 'block';
    }

    // Show/hide VOD settings subtabs (Series and Movies)
    const seriesSubnavBtn = document.querySelector('.settings-subnav-btn[data-filter-type="series"]');
    const moviesSubnavBtn = document.querySelector('.settings-subnav-btn[data-filter-type="movies"]');
    if (seriesSubnavBtn) seriesSubnavBtn.style.display = developerModeEnabled ? 'flex' : 'none';
    if (moviesSubnavBtn) moviesSubnavBtn.style.display = developerModeEnabled ? 'flex' : 'none';

    if (!developerModeEnabled) {
        if (typeof window.activeSettingsFilterTab !== 'undefined' && (window.activeSettingsFilterTab === 'series' || window.activeSettingsFilterTab === 'movies')) {
            if (typeof window.setSettingsFilterTab === 'function') {
                window.setSettingsFilterTab('tv');
            }
        }
    }

    // Show/hide Event Assigner developer-only subtabs (Languages, Genre)
    const tabLanguages = document.getElementById('assigner-tab-languages');
    const tabGenres = document.getElementById('assigner-tab-genres');
    if (tabLanguages) tabLanguages.style.display = developerModeEnabled ? 'block' : 'none';
    if (tabGenres) tabGenres.style.display = developerModeEnabled ? 'block' : 'none';

    if (!developerModeEnabled) {
        if (window.assignerActiveTab === 'languages' || window.assignerActiveTab === 'genres') {
            if (typeof window.setAssignerActiveTab === 'function') {
                window.setAssignerActiveTab('events');
            }
        }
    }

    // Show/hide HUD toggle sources button and indicators (Tarea 28)
    const showDevControls = developerModeEnabled && hudDevControlsEnabled;
    const hudToggleSourcesBtn = document.getElementById('hud-toggle-sources-btn');
    const hudSourcesRow = document.getElementById('hud-sources-row');
    const hudIndicatorAudio = document.getElementById('hud-indicator-audio');
    const hudIndicatorVideo = document.getElementById('hud-indicator-video');
    const hudChannelFilters = document.getElementById('hud-channel-filters');

    if (hudToggleSourcesBtn) {
        hudToggleSourcesBtn.style.display = showDevControls ? 'flex' : 'none';
    }
    if (hudIndicatorAudio) {
        hudIndicatorAudio.style.display = showDevControls ? 'flex' : 'none';
    }
    if (hudIndicatorVideo) {
        hudIndicatorVideo.style.display = showDevControls ? 'flex' : 'none';
    }
    if (!showDevControls && hudSourcesRow) {
        hudSourcesRow.classList.add('hidden');
        if (hudToggleSourcesBtn) {
            hudToggleSourcesBtn.style.color = 'rgba(255, 255, 255, 0.5)';
        }
    }
    if (hudChannelFilters) {
        hudChannelFilters.style.display = !showDevControls ? 'flex' : 'none';
    }

    // Handle immediate tab redirection if user deactivates developer mode while on a dev tab
    if (!developerModeEnabled) {
        const activeTabBtn = document.querySelector('.settings-tab-btn.active');
        const activeTab = activeTabBtn ? activeTabBtn.dataset.settingsTab : null;
        if (activeTab === 'developer' || activeTab === 'connectivity' || activeTab === 'sensors' || activeTab === 'channels') {
            const generalTabBtn = document.querySelector('.settings-tab-btn[data-settings-tab="general"]');
            if (generalTabBtn) {
                generalTabBtn.click();
            }
        }
    }

    // Dynamically update trial/subscription status text in Account tab
    const trialStatusEl = document.getElementById('account-trial-status');
    if (trialStatusEl) {
        if (developerModeEnabled) {
            trialStatusEl.innerText = 'Developer Mode';
        } else {
            nativeApi.getNetworkDate().then(trialCheck => {
                if (trialCheck && trialCheck.firstTime) {
                    trialStatusEl.innerText = 'Trial period active (3 days remaining).';
                } else if (trialCheck) {
                    const totalHoursLeft = Math.max(0, (3 - (trialCheck.elapsedDays || 0)) * 24);
                    const d = Math.floor(totalHoursLeft / 24);
                    const h = Math.round(totalHoursLeft % 24);
                    const timeStr = d >= 1 ? `${d} days remaining.` : `${h} hours remaining.`;
                    trialStatusEl.innerText = `Trial period active. ${timeStr}`;
                }
            }).catch(() => {
                trialStatusEl.innerText = 'Trial period active.';
            });
        }
    }
}
window.updateDeveloperUI = updateDeveloperUI;
