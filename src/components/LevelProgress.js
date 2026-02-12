/**
 * ═══════════════════════════════════════════════════════════
 * LEVEL PROGRESS COMPONENT
 * ═══════════════════════════════════════════════════════════
 * Displays progress towards next level with stats and requirements
 */

import { LevelSystem } from '../lib/LevelSystem.js';
import { pb } from '../pocketbase.js';
import { createLevelBadge } from './LevelBadge.js';

/**
 * Create a complete level progress display
 * @param {string} userId - User ID
 * @param {string} variant - Display variant: 'full', 'compact', 'minimal'
 * @returns {Promise<HTMLElement>} Progress element
 */
export async function createLevelProgress(userId, variant = 'full') {
    const levelSystem = new LevelSystem(pb);
    const levelInfo = await levelSystem.getUserLevelInfo(userId);

    const container = document.createElement('div');
    container.className = `level-progress level-progress--${variant}`;
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: ${variant === 'minimal' ? '0.5rem' : '1rem'};
        background: var(--bg-secondary, #1a1a1a);
        border-radius: 0.75rem;
        ${variant === 'full' ? 'border: 1px solid rgba(255,255,255,0.1);' : ''}
    `;

    // Current Level Badge
    if (variant !== 'minimal') {
        const badgeRow = document.createElement('div');
        badgeRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        const badge = createLevelBadge(levelInfo.current.level, 'medium', true);
        badgeRow.appendChild(badge);

        if (variant === 'full' && levelInfo.stats.progress < 100) {
            const progressText = document.createElement('span');
            progressText.style.cssText = `
                font-size: 0.85rem;
                color: rgba(255,255,255,0.6);
            `;
            progressText.textContent = `${levelInfo.stats.progress}%`;
            badgeRow.appendChild(progressText);
        }

        container.appendChild(badgeRow);
    }

    // Progress Bar
    if (levelInfo.next) {
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.cssText = `
            width: 100%;
            height: ${variant === 'minimal' ? '4px' : '8px'};
            background: rgba(255,255,255,0.1);
            border-radius: 1rem;
            overflow: hidden;
        `;

        const progressBarFill = document.createElement('div');
        progressBarFill.style.cssText = `
            height: 100%;
            width: ${levelInfo.stats.progress}%;
            background: linear-gradient(90deg, ${levelInfo.current.color}, ${levelInfo.current.color}dd);
            border-radius: 1rem;
            transition: width 0.3s ease;
        `;

        progressBarContainer.appendChild(progressBarFill);
        container.appendChild(progressBarContainer);
    }

    // Stats & Requirements (Full variant only)
    if (variant === 'full' && levelInfo.next) {
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: rgba(255,255,255,0.7);
        `;

        // Next level info
        const nextLevelText = document.createElement('div');
        nextLevelText.style.fontWeight = '600';
        nextLevelText.innerHTML = `Siguiente: <span style="color: ${levelInfo.current.color}">${levelInfo.next.name}</span>`;
        statsContainer.appendChild(nextLevelText);

        // Requirements
        const reqsContainer = document.createElement('div');
        reqsContainer.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
        `;

        const postReq = document.createElement('div');
        postReq.innerHTML = `📝 Posts: <strong>${levelInfo.stats.totalPosts}/${levelInfo.next.requirements.posts}</strong>`;
        reqsContainer.appendChild(postReq);

        const copyReq = document.createElement('div');
        copyReq.innerHTML = `📋 Copias: <strong>${levelInfo.stats.totalCopies}/${levelInfo.next.requirements.copies}</strong>`;
        reqsContainer.appendChild(copyReq);

        statsContainer.appendChild(reqsContainer);
        container.appendChild(statsContainer);
    }

    // Max Level Message
    if (!levelInfo.next) {
        const maxLevelMsg = document.createElement('div');
        maxLevelMsg.style.cssText = `
            text-align: center;
            font-size: 0.85rem;
            color: ${levelInfo.current.color};
            font-weight: 600;
        `;
        maxLevelMsg.innerHTML = `🏆 ¡Nivel Máximo Alcanzado!`;
        container.appendChild(maxLevelMsg);
    }

    return container;
}

/**
 * Create a compact inline level display (for gallery cards, etc.)
 * @param {number} level - User level
 * @param {number} progress - Progress percentage (0-100)
 * @returns {HTMLElement} Compact progress element
 */
export function createInlineLevelDisplay(level, progress = 0) {
    const container = document.createElement('div');
    container.className = 'level-display-inline';
    container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;

    const badge = createLevelBadge(level, 'small', false);
    container.appendChild(badge);

    if (progress < 100) {
        const miniBar = document.createElement('div');
        miniBar.style.cssText = `
            width: 40px;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 1rem;
            overflow: hidden;
        `;

        const fill = document.createElement('div');
        fill.style.cssText = `
            height: 100%;
            width: ${progress}%;
            background: ${LEVEL_REQS[level]?.color || '#22c55e'};
            border-radius: 1rem;
        `;

        miniBar.appendChild(fill);
        container.appendChild(miniBar);
    }

    return container;
}
