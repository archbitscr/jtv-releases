// Source switcher UI updates
// Mantiene la barra de botones (.source-btn) coherente con el source activo.

export function updateSourceSwitcherUI(source) {
    const sourceBtns = document.querySelectorAll('.source-btn');
    sourceBtns.forEach(btn => {
        if (btn.dataset.source === source) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Compatibilidad con código legacy que aún consume window.updateSourceSwitcherUI.
if (typeof window !== 'undefined') {
    window.updateSourceSwitcherUI = updateSourceSwitcherUI;
}
