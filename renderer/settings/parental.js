let currentPinCallback = null;

export function getCurrentPinCallback() {
    return currentPinCallback;
}

export function setCurrentPinCallback(val) {
    currentPinCallback = val;
}

export async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPIN(inputPin, hashedPin) {
    const hashedInput = await hashPIN(inputPin);
    return hashedInput === hashedPin;
}

export function isParentalTimeLocked() {
    const kidsMode = localStorage.getItem('jtv_parental_kids_mode') === 'true';
    if (!kidsMode) return false;

    const scheduleEnabled = localStorage.getItem('jtv_parental_schedule_enabled') === 'true';
    if (!scheduleEnabled) return true; // Permanently locked if schedule is disabled!

    const startTime = localStorage.getItem('jtv_parental_start_time') || '08:00';
    const endTime = localStorage.getItem('jtv_parental_end_time') || '20:00';

    const now = new Date();
    const currentStr = now.toTimeString().slice(0, 5); // "HH:MM"

    if (startTime <= endTime) {
        return currentStr >= startTime && currentStr <= endTime;
    } else {
        return currentStr >= startTime || currentStr <= endTime;
    }
}

export function promptParentalPIN(callback, customMessage = "") {
    const modal = document.getElementById('parental-pin-modal');
    const input = document.getElementById('parental-pin-input');
    const msgEl = document.getElementById('parental-pin-message');
    const errorEl = document.getElementById('parental-pin-error');
    
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
    
    if (!modal || !input) {
        callback(false);
        return;
    }
    
    if (customMessage && msgEl) {
        msgEl.textContent = customMessage;
    } else if (msgEl) {
        msgEl.textContent = "Enter your 6-digit PIN to continue:";
    }
    
    input.value = '';

    // Confirm starts disabled; it only enables once a valid/correct PIN is typed
    // (see the input handler in eventListeners.js).
    const submitBtn = document.getElementById('parental-pin-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    modal.classList.remove('hidden');
    input.focus();
    
    currentPinCallback = (confirmed) => {
        modal.classList.add('hidden');
        callback(confirmed);
    };
}
