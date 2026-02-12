import { store } from '../store-final.js';

export const escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const getModeration = (p) => {
    // 1. Determine effective rating (handle sequences)
    let rating = p.rating || 'SFW / Apto';
    if (p.type === 'sequence' && p.content && p.content.length > 0) {
        rating = p.content[0].rating || 'SFW / Apto';
    }

    // 2. Get User Settings (Default: Blur everything for new/unconfigured users)
    const mod = store.currentUser?.moderation || { suggestive: 'BLUR', nsfw: 'BLUR' };

    let applyBlur = false;
    let warningLabel = '';

    // 3. Apply Logic
    if (rating === 'Sugestivo') {
        if (mod.suggestive === 'BLUR') {
            applyBlur = true;
            warningLabel = 'SUGESTIVO';
        }
    } else if (rating === 'NSFW / +18') {
        if (mod.nsfw === 'BLUR' || mod.nsfw === 'OFF') {
            // Even if OFF, if it slipped through filter, we blur it.
            applyBlur = true;
            warningLabel = 'NSFW';
        }
    }

    return { applyBlur, warningLabel };
};
