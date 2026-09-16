let glassTunerOpen = false;
let glassTunerEnabled = false;

const TARGETS = [
    { key: 'hud', label: 'Player Bar', selector: '.pbar', borderSide: 'borderColor' },
    { key: 'sidebar', label: 'Sidebar', selector: '.glass-menu', borderSide: 'borderRightColor' },
    { key: 'topnav', label: 'Top Nav', selector: '.tnav-menu', borderSide: 'borderColor' },
];

const PARAMS = [
    { key: 'bgR', label: 'Tint R', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgG', label: 'Tint G', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgB', label: 'Tint B', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgA', label: 'Tint Opacity', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'blur', label: 'Blur', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'borderR', label: 'Border R', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderG', label: 'Border G', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderB', label: 'Border B', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderA', label: 'Border Opacity', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'shadowBlur', label: 'Shadow Blur', min: 0, max: 80, step: 1, unit: 'px' },
    { key: 'shadowSpread', label: 'Shadow Spread', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'shadowA', label: 'Shadow Opacity', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'insetA', label: 'Inset Glow', min: 0, max: 0.5, step: 0.01, unit: '' },
];

const DEFAULTS = {
    hud:     { bgR: 0, bgG: 0, bgB: 0, bgA: 0.3, blur: 6, borderR: 255, borderG: 255, borderB: 255, borderA: 0.1, shadowBlur: 15, shadowSpread: 15, shadowA: 0.2, insetA: 0.15 },
    sidebar: { bgR: 0, bgG: 0, bgB: 0, bgA: 0.3, blur: 8, borderR: 255, borderG: 255, borderB: 255, borderA: 0.1, shadowBlur: 20, shadowSpread: 8,  shadowA: 0.5, insetA: 0.15 },
    topnav:  { bgR: 0, bgG: 0, bgB: 0, bgA: 0.3, blur: 6, borderR: 255, borderG: 255, borderB: 255, borderA: 0.1, shadowBlur: 20, shadowSpread: 5,  shadowA: 0.25, insetA: 0.15 },
};

function getDefaults(key) {
    return { ...DEFAULTS[key] };
}

function copyToClipboard(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

function applyValues(el, values, target) {
    const borderProp = target.borderSide || 'borderColor';
    el.style.background = `rgba(${values.bgR}, ${values.bgG}, ${values.bgB}, ${values.bgA})`;
    el.style.backdropFilter = `blur(${values.blur}px)`;
    el.style.webkitBackdropFilter = `blur(${values.blur}px)`;
    el.style[borderProp] = `rgba(${values.borderR}, ${values.borderG}, ${values.borderB}, ${values.borderA})`;
    el.style.boxShadow = `0 20px ${values.shadowBlur}px ${values.shadowSpread}px rgba(0, 0, 0, ${values.shadowA}), inset 0 1px 1px rgba(255, 255, 255, ${values.insetA})`;
}

function clearInlineStyles(el, target) {
    const borderProp = target ? (target.borderSide || 'borderColor') : 'borderColor';
    el.style.background = '';
    el.style.backdropFilter = '';
    el.style.webkitBackdropFilter = '';
    el.style[borderProp] = '';
    el.style.boxShadow = '';
}

function buildModal() {
    const modal = document.createElement('div');
    modal.id = 'glass-tuner-modal';
    modal.className = 'glass-tuner-modal';
    modal.innerHTML = `
        <div class="glass-tuner-header">
            <span class="glass-tuner-title">Glass Tuner</span>
            <button id="glass-tuner-close" class="glass-tuner-close-btn"><i data-lucide="x"></i></button>
        </div>
        <div class="glass-tuner-tabs">
            ${TARGETS.map((t, i) => `<button class="glass-tuner-tab${i === 0 ? ' active' : ''}" data-target="${t.key}">${t.label}</button>`).join('')}
        </div>
        <div class="glass-tuner-body">
            ${TARGETS.map((t, i) => `
                <div class="glass-tuner-panel${i === 0 ? ' active' : ''}" data-panel="${t.key}">
                    ${PARAMS.map(p => `
                        <div class="glass-tuner-row">
                            <label class="glass-tuner-label">${p.label}</label>
                            <input type="range" class="glass-tuner-range" data-target="${t.key}" data-param="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}">
                            <input type="number" class="glass-tuner-number" data-target="${t.key}" data-param="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}">
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
        <div class="glass-tuner-actions">
            <button id="glass-tuner-reset" class="glass-tuner-action-btn">Reset</button>
            <button id="glass-tuner-copy" class="glass-tuner-action-btn glass-tuner-save-btn">Copy CSS</button>
        </div>
    `;
    document.body.appendChild(modal);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const state = {};
    TARGETS.forEach(t => {
        state[t.key] = getDefaults(t.key);
    });

    function syncUI() {
        TARGETS.forEach(t => {
            PARAMS.forEach(p => {
                const range = modal.querySelector(`.glass-tuner-range[data-target="${t.key}"][data-param="${p.key}"]`);
                const num = modal.querySelector(`.glass-tuner-number[data-target="${t.key}"][data-param="${p.key}"]`);
                if (range) range.value = state[t.key][p.key];
                if (num) num.value = state[t.key][p.key];
            });
        });
    }

    function applyAll() {
        TARGETS.forEach(t => {
            const el = document.querySelector(t.selector);
            if (el) applyValues(el, state[t.key], t);
        });
    }

    syncUI();

    modal.addEventListener('input', (e) => {
        const target = e.target.dataset.target;
        const param = e.target.dataset.param;
        if (!target || !param) return;
        const val = parseFloat(e.target.value);
        state[target][param] = val;
        const sibling = e.target.classList.contains('glass-tuner-range')
            ? modal.querySelector(`.glass-tuner-number[data-target="${target}"][data-param="${param}"]`)
            : modal.querySelector(`.glass-tuner-range[data-target="${target}"][data-param="${param}"]`);
        if (sibling) sibling.value = val;
        const tObj = TARGETS.find(t => t.key === target);
        const el = document.querySelector(tObj.selector);
        if (el) applyValues(el, state[target], tObj);
    });

    // Tabs
    modal.querySelectorAll('.glass-tuner-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            modal.querySelectorAll('.glass-tuner-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.glass-tuner-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelector(`.glass-tuner-panel[data-panel="${tab.dataset.target}"]`).classList.add('active');
        });
    });

    // Close
    document.getElementById('glass-tuner-close').addEventListener('click', toggleGlassTuner);

    // Reset
    document.getElementById('glass-tuner-reset').addEventListener('click', () => {
        TARGETS.forEach(t => {
            state[t.key] = getDefaults(t.key);
            const el = document.querySelector(t.selector);
            if (el) clearInlineStyles(el, t);
        });
        syncUI();
    });

    // Copy CSS
    document.getElementById('glass-tuner-copy').addEventListener('click', () => {
        let css = '';
        TARGETS.forEach(t => {
            const v = state[t.key];
            css += `/* ${t.label} */\n`;
            css += `${t.selector} {\n`;
            css += `    background: rgba(${v.bgR}, ${v.bgG}, ${v.bgB}, ${v.bgA});\n`;
            css += `    backdrop-filter: blur(${v.blur}px);\n`;
            css += `    -webkit-backdrop-filter: blur(${v.blur}px);\n`;
            css += `    border-color: rgba(${v.borderR}, ${v.borderG}, ${v.borderB}, ${v.borderA});\n`;
            css += `    box-shadow: 0 20px ${v.shadowBlur}px ${v.shadowSpread}px rgba(0, 0, 0, ${v.shadowA}), inset 0 1px 1px rgba(255, 255, 255, ${v.insetA});\n`;
            css += `}\n\n`;
        });
        copyToClipboard(css);
        const btn = document.getElementById('glass-tuner-copy');
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = original, 1500);
    });

    makeDraggable(modal);
    return modal;
}

function makeDraggable(modal) {
    const header = modal.querySelector('.glass-tuner-header');
    let isDragging = false, startX, startY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        // Convert to left/top if currently anchored by right
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        modal.style.right = '';
        modal.style.transform = 'none';
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newLeft = Math.max(0, Math.min(e.clientX - startX, window.innerWidth - modal.offsetWidth));
        let newTop = Math.max(0, Math.min(e.clientY - startY, window.innerHeight - modal.offsetHeight));
        modal.style.left = newLeft + 'px';
        modal.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });
}

function toggleGlassTuner() {
    let modal = document.getElementById('glass-tuner-modal');
    if (!modal) {
        modal = buildModal();
        // Default position: near top-right, clear of floating controls
        modal.style.top = '80px';
        modal.style.right = '140px';
    }
    glassTunerOpen = !glassTunerOpen;
    modal.classList.toggle('show', glassTunerOpen);
}

export function initGlassTuner() {
    const toggle = document.getElementById('glass-tuner-toggle');
    const btn = document.getElementById('glass-tuner-btn');

    if (toggle) {
        const saved = localStorage.getItem('jtv_glass_tuner_enabled');
        glassTunerEnabled = saved === 'true';
        toggle.checked = glassTunerEnabled;
        if (btn) btn.style.display = glassTunerEnabled ? '' : 'none';

        toggle.addEventListener('change', (e) => {
            glassTunerEnabled = e.target.checked;
            localStorage.setItem('jtv_glass_tuner_enabled', glassTunerEnabled);
            if (btn) btn.style.display = glassTunerEnabled ? '' : 'none';
            if (!glassTunerEnabled) {
                const modal = document.getElementById('glass-tuner-modal');
                if (modal) {
                    modal.classList.remove('show');
                    glassTunerOpen = false;
                }
                TARGETS.forEach(t => {
                    const el = document.querySelector(t.selector);
                    if (el) clearInlineStyles(el, t);
                });
            }
        });
    }

    if (btn) {
        btn.addEventListener('click', toggleGlassTuner);
    }
}
