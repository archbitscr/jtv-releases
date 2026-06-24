let glassTunerOpen = false;
let glassTunerEnabled = false;

const TARGETS = [
    { key: 'hud', label: 'HUD (Source Switcher)', selector: '.source-switcher' },
    { key: 'sidebar', label: 'Sidebar (Menu)', selector: '.glass-menu' },
    { key: 'topnav', label: 'Top Nav', selector: '.top-nav-menu' },
];

const PARAMS = [
    { key: 'bgR', label: 'Tinte R', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgG', label: 'Tinte G', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgB', label: 'Tinte B', min: 0, max: 255, step: 1, unit: '' },
    { key: 'bgA', label: 'Tinte Opacidad', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'blur', label: 'Blur', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'borderR', label: 'Borde R', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderG', label: 'Borde G', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderB', label: 'Borde B', min: 0, max: 255, step: 1, unit: '' },
    { key: 'borderA', label: 'Borde Opacidad', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'shadowBlur', label: 'Sombra Blur', min: 0, max: 80, step: 1, unit: 'px' },
    { key: 'shadowSpread', label: 'Sombra Spread', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'shadowA', label: 'Sombra Opacidad', min: 0, max: 1, step: 0.01, unit: '' },
    { key: 'insetA', label: 'Inset Glow', min: 0, max: 0.5, step: 0.01, unit: '' },
];

function parseCurrentValues(el) {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor || 'rgba(0,0,0,0.05)';
    const bgMatch = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const blur = (cs.backdropFilter || cs.webkitBackdropFilter || '').match(/blur\(([\d.]+)px\)/);
    const border = cs.borderColor || 'rgba(255,255,255,0.08)';
    const borderMatch = border.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const shadow = cs.boxShadow || '';
    const shadowParts = shadow.match(/([\d.]+)px\s+([\d.]+)px\s+([\d.]+)px\s+([\d.]+)px\s+rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    const insetMatch = shadow.match(/inset\s+[\d.]+px\s+[\d.]+px\s+[\d.]+px\s+rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);

    return {
        bgR: bgMatch ? parseInt(bgMatch[1]) : 0,
        bgG: bgMatch ? parseInt(bgMatch[2]) : 0,
        bgB: bgMatch ? parseInt(bgMatch[3]) : 0,
        bgA: bgMatch && bgMatch[4] !== undefined ? parseFloat(bgMatch[4]) : 1,
        blur: blur ? parseFloat(blur[1]) : 4,
        borderR: borderMatch ? parseInt(borderMatch[1]) : 255,
        borderG: borderMatch ? parseInt(borderMatch[2]) : 255,
        borderB: borderMatch ? parseInt(borderMatch[3]) : 255,
        borderA: borderMatch && borderMatch[4] !== undefined ? parseFloat(borderMatch[4]) : 0.08,
        shadowBlur: shadowParts ? parseFloat(shadowParts[3]) : 45,
        shadowSpread: shadowParts ? parseFloat(shadowParts[4]) : 0,
        shadowA: shadowParts ? parseFloat(shadowParts[8]) : 0.8,
        insetA: insetMatch ? parseFloat(insetMatch[1]) : 0.1,
    };
}

function applyValues(el, values) {
    el.style.background = `rgba(${values.bgR}, ${values.bgG}, ${values.bgB}, ${values.bgA})`;
    el.style.backdropFilter = `blur(${values.blur}px)`;
    el.style.webkitBackdropFilter = `blur(${values.blur}px)`;
    el.style.borderColor = `rgba(${values.borderR}, ${values.borderG}, ${values.borderB}, ${values.borderA})`;
    el.style.boxShadow = `0 20px ${values.shadowBlur}px ${values.shadowSpread}px rgba(0, 0, 0, ${values.shadowA}), inset 0 1px 1px rgba(255, 255, 255, ${values.insetA})`;
}

function clearInlineStyles(el) {
    el.style.background = '';
    el.style.backdropFilter = '';
    el.style.webkitBackdropFilter = '';
    el.style.borderColor = '';
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
            <button id="glass-tuner-copy" class="glass-tuner-action-btn glass-tuner-save-btn">Copiar CSS</button>
        </div>
    `;
    document.body.appendChild(modal);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const state = {};
    TARGETS.forEach(t => {
        const el = document.querySelector(t.selector);
        state[t.key] = el ? parseCurrentValues(el) : { bgR: 0, bgG: 0, bgB: 0, bgA: 0.05, blur: 4, borderR: 255, borderG: 255, borderB: 255, borderA: 0.08, shadowBlur: 45, shadowSpread: 0, shadowA: 0.8, insetA: 0.1 };
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
            if (el) applyValues(el, state[t.key]);
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
        const el = document.querySelector(TARGETS.find(t => t.key === target).selector);
        if (el) applyValues(el, state[target]);
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
            const el = document.querySelector(t.selector);
            if (el) {
                clearInlineStyles(el);
                state[t.key] = parseCurrentValues(el);
            }
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
        navigator.clipboard.writeText(css).then(() => {
            const btn = document.getElementById('glass-tuner-copy');
            const original = btn.textContent;
            btn.textContent = '¡Copiado!';
            setTimeout(() => btn.textContent = original, 1500);
        });
    });

    return modal;
}

function toggleGlassTuner() {
    let modal = document.getElementById('glass-tuner-modal');
    if (!modal) modal = buildModal();
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
                    if (el) clearInlineStyles(el);
                });
            }
        });
    }

    if (btn) {
        btn.addEventListener('click', toggleGlassTuner);
    }
}
