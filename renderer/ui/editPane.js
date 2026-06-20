import { state } from '../state/appState.js';
import { sanitizeMediaUrl } from '../utils/sanitize.js';
import { getPlaceholderHtml, TV_ICON_SVG } from '../utils/domHelpers.js';

export function checkValidity() {
    const editNameInput = document.getElementById('edit-name-input');
    const editIdInput = document.getElementById('edit-id-input');
    const editStreamInput = document.getElementById('edit-stream-input');
    
    if (!editNameInput || !editIdInput) return;

    const nameValid = editNameInput.value.trim() !== "";
    const idValid = editIdInput.value.trim() !== "";
    const streamValid = editStreamInput ? editStreamInput.value.trim() !== "" : true;
    
    editNameInput.classList.toggle('input-error', !nameValid);
    editIdInput.classList.toggle('input-error', !idValid);
    if (editStreamInput) editStreamInput.classList.toggle('input-error', !streamValid);
    
    const nameError = document.getElementById('edit-name-error');
    if (nameError) nameError.classList.toggle('hidden', nameValid);
    
    const idError = document.getElementById('edit-id-error');
    if (idError) idError.classList.toggle('hidden', idValid);
    
    const streamError = document.getElementById('edit-stream-error');
    if (streamError) streamError.classList.toggle('hidden', streamValid);
}

export function updateEditLogo(logo) {
    const editLogoPreview = document.getElementById('edit-logo-preview');
    if (!editLogoPreview) return;

    const channel = state.channels.find(c => c.id === state.currentEditingChannelId);
    const safeLogo = sanitizeMediaUrl(logo, { allowDataImage: true, fallback: '' });
    const logoHtml = safeLogo ? `<img src="${safeLogo}" data-fallback-edit-logo="1">` : (channel && channel.name ? getPlaceholderHtml(channel.name) : TV_ICON_SVG);
    editLogoPreview.innerHTML = logoHtml;
}
