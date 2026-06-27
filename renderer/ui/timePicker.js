// Premium custom time picker that replaces the native <input type="time">
// dropdown (which renders as an unstyleable OS/Windows-default control).
// The native input is kept in the DOM (hidden) as the value store so any
// existing code reading `.value` ("HH:MM" 24h) keeps working.

let openDropdownCloser = null; // closes whichever picker is currently open

function to12h(value) {
    const [hStr, mStr] = (value || '08:00').split(':');
    let h = parseInt(hStr, 10);
    const min = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { h12, min, period };
}

function to24h(h12, min, period) {
    let h = h12 % 12;
    if (period === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * Replace a native time input with a custom premium time picker.
 * @param {HTMLInputElement} input - native <input type="time">
 * @param {(value: string) => void} onChange - called with "HH:MM" (24h)
 * @returns {{ setDisabled: (d: boolean) => void, setValue: (v: string) => void }}
 */
export function attachTimePicker(input, onChange) {
    if (!input || input.dataset.ctpAttached === '1') return null;
    input.dataset.ctpAttached = '1';
    input.style.display = 'none';

    const root = document.createElement('div');
    root.className = 'custom-time-picker';

    const display = document.createElement('button');
    display.type = 'button';
    display.className = 'ctp-display';

    const dropdown = document.createElement('div');
    dropdown.className = 'ctp-dropdown hidden';
    dropdown.innerHTML = `
        <div class="ctp-steppers">
            <div class="ctp-stepper">
                <button type="button" class="ctp-arrow" data-act="hour-up"><i data-lucide="chevron-up"></i></button>
                <span class="ctp-val ctp-val-hour">06</span>
                <button type="button" class="ctp-arrow" data-act="hour-down"><i data-lucide="chevron-down"></i></button>
            </div>
            <span class="ctp-colon">:</span>
            <div class="ctp-stepper">
                <button type="button" class="ctp-arrow" data-act="min-up"><i data-lucide="chevron-up"></i></button>
                <span class="ctp-val ctp-val-min">00</span>
                <button type="button" class="ctp-arrow" data-act="min-down"><i data-lucide="chevron-down"></i></button>
            </div>
        </div>
        <div class="ctp-period-toggle">
            <button type="button" class="ctp-period-btn" data-period="AM">AM</button>
            <button type="button" class="ctp-period-btn" data-period="PM">PM</button>
        </div>
    `;

    root.appendChild(display);
    root.appendChild(dropdown);
    input.insertAdjacentElement('afterend', root);

    let state = to12h(input.value);

    const valHourEl = dropdown.querySelector('.ctp-val-hour');
    const valMinEl = dropdown.querySelector('.ctp-val-min');
    const periodBtns = dropdown.querySelectorAll('.ctp-period-btn');

    const renderDisplay = () => {
        display.innerHTML = `
            <i data-lucide="clock"></i>
            <span class="ctp-time">${pad2(state.h12)}<span class="ctp-sep">:</span>${pad2(state.min)}</span>
            <span class="ctp-period">${state.period}</span>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const renderDropdownValues = () => {
        valHourEl.textContent = pad2(state.h12);
        valMinEl.textContent = pad2(state.min);
        periodBtns.forEach(b => b.classList.toggle('active', b.dataset.period === state.period));
    };

    const commit = () => {
        const value = to24h(state.h12, state.min, state.period);
        input.value = value;
        renderDisplay();
        renderDropdownValues();
        if (typeof onChange === 'function') onChange(value);
    };

    const step = (act) => {
        switch (act) {
            case 'hour-up': state.h12 = state.h12 % 12 + 1; break;
            case 'hour-down': state.h12 = state.h12 === 1 ? 12 : state.h12 - 1; break;
            case 'min-up': state.min = (state.min + 1) % 60; break;
            case 'min-down': state.min = (state.min + 59) % 60; break;
        }
        commit();
    };

    dropdown.querySelectorAll('.ctp-arrow').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); step(btn.dataset.act); };
    });
    periodBtns.forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); state.period = btn.dataset.period; commit(); };
    });

    const closeDropdown = () => {
        dropdown.classList.add('hidden');
        display.classList.remove('open');
        if (openDropdownCloser === closeDropdown) openDropdownCloser = null;
        document.removeEventListener('mousedown', onOutside, true);
    };

    const onOutside = (e) => {
        if (!root.contains(e.target)) closeDropdown();
    };

    const openDropdown = () => {
        if (openDropdownCloser && openDropdownCloser !== closeDropdown) openDropdownCloser();
        renderDropdownValues();
        dropdown.classList.remove('hidden');
        display.classList.add('open');
        if (window.lucide) window.lucide.createIcons();
        openDropdownCloser = closeDropdown;

        // Open upward when there isn't enough room below (avoids being
        // clipped by the settings container's overflow).
        const rect = display.getBoundingClientRect();
        const ddHeight = dropdown.offsetHeight || 200;
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < ddHeight + 16 && rect.top > ddHeight + 16) {
            dropdown.classList.add('drop-up');
        } else {
            dropdown.classList.remove('drop-up');
        }

        document.addEventListener('mousedown', onOutside, true);
    };

    display.onclick = (e) => {
        e.stopPropagation();
        if (display.classList.contains('disabled')) return;
        if (dropdown.classList.contains('hidden')) openDropdown();
        else closeDropdown();
    };

    renderDisplay();

    return {
        setDisabled: (d) => {
            display.classList.toggle('disabled', !!d);
            if (d) closeDropdown();
        },
        setValue: (v) => {
            state = to12h(v);
            input.value = v;
            renderDisplay();
        }
    };
}
