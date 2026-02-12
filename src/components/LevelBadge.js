/**
 * ═══════════════════════════════════════════════════════════
 * LEVEL BADGE COMPONENT
 * ═══════════════════════════════════════════════════════════
 * Displays a user's level with icon, name, and color
 */

import { LEVEL_REQS } from '../store-final.js';

/**
 * Create a level badge element
 * @param {number} level - User's level (0-5)
 * @param {string} size - Size variant: 'small', 'medium', 'large'
 * @param {boolean} showName - Whether to show level name
 * @returns {HTMLElement} Badge element
 */
export function createLevelBadge(level = 0, size = 'medium', showName = true) {
    const levelInfo = LEVEL_REQS[level] || LEVEL_REQS[0];

    const badge = document.createElement('span');
    badge.className = `level-badge level-badge--${size}`;
    badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.65rem;
        border-radius: 1rem;
        background: ${levelInfo.color}15;
        border: 1.5px solid ${levelInfo.color};
        font-weight: 600;
        font-size: ${size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.85rem'};
        color: ${levelInfo.color};
        white-space: nowrap;
    `;

    const icon = document.createElement('span');
    icon.textContent = levelInfo.icon;
    icon.style.fontSize = size === 'small' ? '0.9rem' : size === 'large' ? '1.25rem' : '1.1rem';

    badge.appendChild(icon);

    if (showName) {
        const name = document.createElement('span');
        name.textContent = levelInfo.name;
        badge.appendChild(name);
    }

    return badge;
}

/**
 * Create a compact level indicator (just icon + number)
 * @param {number} level - User's level (0-5)
 * @returns {HTMLElement} Compact badge element
 */
export function createCompactLevelBadge(level = 0) {
    const levelInfo = LEVEL_REQS[level] || LEVEL_REQS[0];

    const badge = document.createElement('span');
    badge.className = 'level-badge level-badge--compact';
    badge.title = `Nivel ${level}: ${levelInfo.name}`;
    badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: ${levelInfo.color};
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        box-shadow: 0 2px 8px ${levelInfo.color}40;
        position: relative;
    `;

    // Icon
    const icon = document.createElement('span');
    icon.textContent = levelInfo.icon;
    icon.style.cssText = `
        font-size: 1.1rem;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    `;

    badge.appendChild(icon);

    return badge;
}

/**
 * Update an existing badge element with new level
 * @param {HTMLElement} badgeElement - Badge element to update
 * @param {number} newLevel - New level to display
 */
export function updateLevelBadge(badgeElement, newLevel) {
    const levelInfo = LEVEL_REQS[newLevel] || LEVEL_REQS[0];

    // Update colors
    badgeElement.style.background = `${levelInfo.color}15`;
    badgeElement.style.borderColor = levelInfo.color;
    badgeElement.style.color = levelInfo.color;

    // Update icon
    const icon = badgeElement.querySelector('span:first-child');
    if (icon) {
        icon.textContent = levelInfo.icon;
    }

    // Update name if present
    const nameSpan = badgeElement.querySelector('span:last-child');
    if (nameSpan && nameSpan !== icon) {
        nameSpan.textContent = levelInfo.name;
    }
}
