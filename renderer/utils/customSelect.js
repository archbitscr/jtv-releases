export function initDashCustomSelects() {
    document.querySelectorAll('.dash-custom-select').forEach(wrapper => {
        const selectId = wrapper.dataset.for;
        const select = document.getElementById(selectId);
        const btn = wrapper.querySelector('.dash-custom-select-btn');
        const menu = wrapper.querySelector('.dash-custom-select-menu');
        if (!select || !btn || !menu) return;

        // Rebuild menu from current select options
        const refreshMenu = () => {
            menu.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                const item = document.createElement('div');
                item.className = 'dash-custom-select-option';
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                if (select.value === opt.value) {
                    item.classList.add('selected');
                    btn.classList.toggle('has-value', opt.value !== 'all');
                    const label = btn.querySelector('.dash-custom-select-label');
                    if (label) {
                        label.textContent = opt.value !== 'all' ? opt.textContent : (select.dataset.label || select.getAttribute('aria-label') || 'Filter');
                    }
                }
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.value = opt.value;
                    const label = btn.querySelector('.dash-custom-select-label');
                    if (label) {
                        label.textContent = opt.value !== 'all' ? opt.textContent : (select.dataset.label || select.getAttribute('aria-label') || 'Filter');
                    }
                    btn.classList.toggle('has-value', opt.value !== 'all');
                    // Update selected highlight in menu
                    menu.querySelectorAll('.dash-custom-select-option').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    // Close menu
                    menu.classList.add('hidden');
                    wrapper.classList.remove('open');
                    // Fire change event
                    select.dispatchEvent(new Event('change'));
                });
                menu.appendChild(item);
            });
        };

        refreshMenu();

        // If already initialized, skip re-attaching the toggle listener
        if (wrapper.dataset.dashInit === '1') return;
        wrapper.dataset.dashInit = '1';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !menu.classList.contains('hidden');
            // Close all other dash dropdowns
            document.querySelectorAll('.dash-custom-select').forEach(w => {
                if (w !== wrapper) {
                    w.querySelector('.dash-custom-select-menu')?.classList.add('hidden');
                    w.classList.remove('open');
                }
            });
            // Also close regular custom selects
            document.querySelectorAll('.custom-select-options').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.custom-select-trigger').forEach(el => el.classList.remove('active'));
            if (isOpen) {
                menu.classList.add('hidden');
                wrapper.classList.remove('open');
            } else {
                menu.classList.remove('hidden');
                wrapper.classList.add('open');
            }
        });
    });

    // Close dash dropdowns when clicking outside
    if (!document._dashSelectClickHandler) {
        document._dashSelectClickHandler = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.dash-custom-select-menu').forEach(m => m.classList.add('hidden'));
            document.querySelectorAll('.dash-custom-select').forEach(w => w.classList.remove('open'));
        });
    }
}

export function syncCustomSelect(select) {
    if (!select) return;
    
    let wrapper = select.parentElement;
    if (!wrapper || !wrapper.classList.contains('custom-select-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        if (select.id) wrapper.id = 'custom-wrapper-' + select.id;
        
        wrapper.style.flex = select.style.flex || '';
        wrapper.style.minWidth = select.style.minWidth || '';
        wrapper.style.margin = select.style.margin || '';
        wrapper.style.height = select.style.height || '';
        wrapper.style.width = select.style.width || '';
        
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        
        select.style.display = 'none';
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        if (select.style.height) {
            trigger.style.height = select.style.height;
        }
        wrapper.appendChild(trigger);
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options hidden';
        wrapper.appendChild(optionsContainer);
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-options').forEach(el => {
                if (el !== optionsContainer) el.classList.add('hidden');
            });
            document.querySelectorAll('.custom-select-trigger').forEach(el => {
                if (el !== trigger) el.classList.remove('active');
            });
            optionsContainer.classList.toggle('hidden');
            trigger.classList.toggle('active');
        });
    }
    
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsContainer = wrapper.querySelector('.custom-select-options');
    
    optionsContainer.innerHTML = '';
    
    const opts = Array.from(select.querySelectorAll('option'));
    opts.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';
        if (select.value === opt.value) {
            optionDiv.classList.add('selected');
            const fixedLabel = select.dataset.label || select.getAttribute('placeholder') || select.options[0]?.textContent || '';
            trigger.innerHTML = `<span>${fixedLabel}</span><i data-lucide="chevron-down" class="chevron-icon"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }
        optionDiv.textContent = opt.textContent;
        optionDiv.dataset.value = opt.value;
        
        optionDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            select.value = opt.value;
            if (window.lucide) window.lucide.createIcons();
            
            optionsContainer.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
            optionDiv.classList.add('selected');
            
            optionsContainer.classList.add('hidden');
            trigger.classList.remove('active');
            
            select.dispatchEvent(new Event('change'));
            if (select.onchange) select.onchange({ target: select });
        });
        
        optionsContainer.appendChild(optionDiv);
    });
}

// Global click handler to close custom selects
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-options').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.custom-select-trigger').forEach(el => el.classList.remove('active'));
});
