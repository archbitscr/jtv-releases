import { eventIconsList, emojiToHtml } from '../filters/filterState.js';
import { updateEventIconSelectBtnColor } from '../filters/filterManager.js';

export function initIconPickers() {
    const iconsList = [
        'tag', 'flame', 'trophy', 'medal', 'award', 'flag', 'car', 'bike', 'utensils', 'pizza', 'coffee', 'dumbbell', 
        'swords', 'target', 'activity', 'film', 'clapperboard', 'globe', 'tv-2', 'radio', 'mic', 'gamepad-2', 
        'star', 'compass', 'smile', 'newspaper', 'music', 'zap', 'camera', 'heart', 'shield', 'shopping-bag', 
        'book-open', 'stethoscope', 'cloud', 'leaf', 'briefcase', 'ghost', 'users', 'theater'
    ];
    
    document.querySelectorAll('.filter-icon-select-btn').forEach(btn => {
        if (btn.dataset.iconPickerInit) return;
        btn.dataset.iconPickerInit = "true";
        
        const wrapper = btn.closest('.filter-icon-picker-wrapper');
        if (!wrapper) return;
        
        // Remove existing dropdown if any (safeguard)
        const existing = wrapper.querySelector('.filter-icon-dropdown');
        if (existing) existing.remove();
        
        const dropdown = document.createElement('div');
        dropdown.className = 'filter-icon-dropdown';
        
        const isEmojiPicker = btn.id === 'event-icon-select-btn' || btn.id === 'genre-icon-select-btn' || btn.id === 'series-icon-select-btn' || btn.id === 'movies-icon-select-btn';
        const iconsToUse = isEmojiPicker ? eventIconsList.map(item => item.name) : iconsList;
        
        const currentSelected = btn.getAttribute('data-selected-icon') || btn.querySelector('i')?.getAttribute('data-lucide') || btn.querySelector('.emoji-icon')?.textContent || '';
        if (isEmojiPicker) {
            updateEventIconSelectBtnColor(btn, currentSelected);
        }
        
        iconsToUse.forEach(iconName => {
            const opt = document.createElement('div');
            opt.className = 'filter-icon-option';
            
            if (isEmojiPicker) {
                const foundColor = eventIconsList.find(i => i.name === iconName)?.color;
                if (foundColor) {
                    opt.style.color = foundColor;
                }
            }
            
            if (currentSelected === iconName) {
                opt.classList.add('active');
            }
            opt.setAttribute('data-icon', iconName);
            const isEmoji = (iconName && /[^\x00-\x7F]/.test(iconName)) || (iconName && iconName.length <= 2);
            opt.innerHTML = isEmoji
                ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${emojiToHtml(iconName, 16)}</span>`
                : `<i data-lucide="${iconName}"></i>`;

            opt.onclick = (e) => {
                e.stopPropagation();
                btn.setAttribute('data-selected-icon', iconName);
                btn.innerHTML = isEmoji
                    ? `<span class="emoji-icon" style="font-size: 16px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;">${emojiToHtml(iconName, 16)}</span>`
                    : `<i data-lucide="${iconName}"></i>`;
                if (isEmojiPicker) {
                    updateEventIconSelectBtnColor(btn, iconName);
                }
                
                dropdown.querySelectorAll('.filter-icon-option').forEach(o => {
                    o.classList.toggle('active', o.getAttribute('data-icon') === iconName);
                });
                
                dropdown.classList.remove('show');
                if (window.lucide) window.lucide.createIcons();
            };
            dropdown.appendChild(opt);
        });
        
        wrapper.appendChild(dropdown);
        
        btn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.filter-icon-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        };
    });
    
    // Global listener only once
    if (!window.filterIconPickerGlobalInit) {
        window.filterIconPickerGlobalInit = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.filter-icon-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        });
    }
}
