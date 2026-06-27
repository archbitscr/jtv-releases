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

    const colHours = document.createElement('div');
    colHours.className = 'ctp-col ctp-col-hours';
    const colMins = document.createElement('div');
    colMins.className = 'ctp-col ctp-col-mins';
    const colPeriod = document.createElement('div');
    colPeriod.className = 'ctp-col ctp-col-period';

    dropdown.appendChild(colHours);
    dropdown.appendChild(colMins);
    dropdown.appendChild(colPeriod);

    root.appendChild(display);
    root.appendChild(dropdown);
    input.insertAdjacentElement('afterend', root);

    let state = to12h(input.value);

    const renderDisplay = () => {
        display.innerHTML = `
            <i data-lucide="clock"></i>
            <span class="ctp-time">${pad2(state.h12)}<span class="ctp-sep">:</span>${pad2(state.min)}</span>
            <span class="ctp-period">${state.period}</span>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    const buildColumn = (col, items, currentVal, onPick, label) => {
        col.innerHTML = '';
        items.forEach(({ val, text }) => {
            const opt = document.createElement('button');
            opt.type = 'button';
            opt.className = 'ctp-option';
            opt.textContent = text;
            if (val === currentVal) opt.classList.add('selected');
            opt.onclick = (e) => {
                e.stopPropagation();
                onPick(val);
            };
            col.appendChild(opt);
        });
    };

    const scrollToSelected = (col) => {
        const sel = col.querySelector('.ctp-option.selected');
        if (sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2;
    };

    const commit = () => {
        const value = to24h(state.h12, state.min, state.period);
        input.value = value;
        renderDisplay();
        if (typeof onChange === 'function') onChange(value);
    };

    const renderColumns = () => {
        const hours = Array.from({ length: 12 }, (_, i) => ({ val: i + 1, text: pad2(i + 1) }));
        const mins = Array.from({ length: 60 }, (_, i) => ({ val: i, text: pad2(i) }));
        const periods = [{ val: 'AM', text: 'AM' }, { val: 'PM', text: 'PM' }];

        buildColumn(colHours, hours, state.h12, (v) => { state.h12 = v; commit(); refreshSelected(); });
        buildColumn(colMins, mins, state.min, (v) => { state.min = v; commit(); refreshSelected(); });
        buildColumn(colPeriod, periods, state.period, (v) => { state.period = v; commit(); refreshSelected(); });
    };

    const refreshSelected = () => {
        const mark = (col, current) => {
            col.querySelectorAll('.ctp-option').forEach(o => {
                o.classList.toggle('selected', o.textContent === String(current) || o.textContent === pad2(current));
            });
        };
        mark(colHours, pad2(state.h12));
        mark(colMins, pad2(state.min));
        mark(colPeriod, state.period);
    };

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
        renderColumns();
        dropdown.classList.remove('hidden');
        display.classList.add('open');
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

        scrollToSelected(colHours);
        scrollToSelected(colMins);
        scrollToSelected(colPeriod);
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
