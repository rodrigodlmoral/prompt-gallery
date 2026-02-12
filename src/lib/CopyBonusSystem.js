/**
 * CopyBonusSystem.js
 * 
 * Handles copy milestone bonuses for prompt authors.
 * When a prompt reaches certain copy counts (10, 50, 100),
 * the author receives PromptBits based on their level.
 */

import { pb } from '../pocketbase.js';
import { LEVEL_REQS } from '../store-final.js';

// Copy milestones per level: { copyCount: bonusAmount }
// Higher levels earn more per milestone
const COPY_MILESTONES = {
    0: {},                              // Exploradores: no bonus yet
    1: { 10: 5, 50: 10 },              // Novato
    2: { 10: 5, 50: 10 },              // Creador Jr
    3: { 10: 5, 50: 10 },              // Creador Elite
    4: { 10: 10, 50: 20 },             // Artista Prompter
    5: { 10: 20, 50: 30, 100: 50 }     // Maestro Prompter
};

/**
 * Check and award copy milestone bonuses after a prompt is copied.
 * 
 * @param {string} authorId - The prompt author's user ID
 * @param {string} promptId - The prompt ID that was copied
 * @param {number} newCopyCount - The NEW copy count after this copy
 * @returns {{ milestoneReached: boolean, copies?: number, bonus?: number }}
 */
export async function checkCopyMilestone(authorId, promptId, newCopyCount) {
    try {
        // 1. Get author's current level
        const author = await pb.collection('users').getOne(authorId);
        const authorLevel = author.level || 0;

        // 2. Get milestones for this level
        const milestones = COPY_MILESTONES[authorLevel] || {};
        const bonusAmount = milestones[newCopyCount];

        if (!bonusAmount) {
            return { milestoneReached: false };
        }

        // 3. Award the bonus to the author
        console.log(`💰 [COPY_BONUS] Milestone! Prompt ${promptId} reached ${newCopyCount} copies. Awarding ${bonusAmount} 💎 to author ${authorId}`);

        await pb.collection('users').update(authorId, {
            tokens: (author.tokens || 0) + bonusAmount,
            total_earned: (author.total_earned || 0) + bonusAmount
        });

        // 4. Log the activity
        try {
            await pb.collection('activity_logs').create({
                user: authorId,
                action: 'copy_milestone_bonus',
                details: {
                    promptId,
                    copies: newCopyCount,
                    bonus: bonusAmount,
                    level: authorLevel
                }
            });
        } catch (logErr) {
            console.warn('[COPY_BONUS] Could not log activity:', logErr.message);
        }

        return {
            milestoneReached: true,
            copies: newCopyCount,
            bonus: bonusAmount
        };

    } catch (err) {
        console.error('[COPY_BONUS] Error checking milestone:', err);
        return { milestoneReached: false };
    }
}

/**
 * Get all available milestones for a given level.
 * Useful for UI display ("Next bonus at X copies!")
 */
export function getMilestonesForLevel(level) {
    return COPY_MILESTONES[level] || {};
}

/**
 * Get the next milestone copy count for a prompt.
 * Returns null if no more milestones.
 */
export function getNextMilestone(level, currentCopies) {
    const milestones = COPY_MILESTONES[level] || {};
    const thresholds = Object.keys(milestones).map(Number).sort((a, b) => a - b);

    for (const threshold of thresholds) {
        if (currentCopies < threshold) {
            return { copies: threshold, bonus: milestones[threshold] };
        }
    }
    return null;
}

export { COPY_MILESTONES };
