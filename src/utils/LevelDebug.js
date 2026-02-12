import { pb } from '../pocketbase.js';
import { store, LEVEL_REQS } from '../store-final.js';
import { LevelSystem } from '../lib/LevelSystem.js';

/**
 * ═══════════════════════════════════════════════════════════
 * LEVEL SYSTEM DEBUG TOOLS (DEV ONLY)
 * ═══════════════════════════════════════════════════════════
 * Utilities to test level progression, UI updates, and restrictions.
 * Usage in Console: await LevelDebug.setLevel(2)
 */
export const LevelDebug = {

    /**
     * Force set a user's level and stats to match requirements
     * @param {number} level - Target level (0-5)
     * @param {string} userId - Optional, defaults to current user
     */
    async setLevel(level, userId = null) {
        if (!userId) userId = store.currentUser?.id;
        if (!userId) return console.error('❌ No user logged in');

        const targetReqs = LEVEL_REQS[level];
        if (!targetReqs) return console.error('❌ Invalid level');

        console.log(`🛠️ Setting user ${userId} to Level ${level} (${targetReqs.name})...`);

        try {
            // Update user stats to meet requirements
            // We set posts/copies slightly above requirement to ensure stability
            const data = {
                level: level,
                posts_count: targetReqs.posts,
                copies_count: targetReqs.copies,
                level_progress: 0 // Reset progress on force set
            };

            await pb.collection('users').update(userId, data);

            // Force reload user profile to update UI
            await store.init();
            if (window.render) window.render();

            console.log(`✅ Success! User is now Level ${level}`);
            window.toast(`🛠️ Debug: Nivel establecido a ${level}`, 'success');

            // Refresh page to see all UI changes (badges, etc)
            // setTimeout(() => window.location.reload(), 1000);

        } catch (err) {
            console.error('❌ Error setting level:', err);
        }
    },

    /**
     * Add dummy posts to simulate progress
     * @param {number} count - Number of posts to add count to (database update only)
     */
    async addPostStats(count = 1) {
        const user = store.currentUser;
        if (!user) return;

        try {
            const newCount = (user.posts_count || 0) + count;
            await pb.collection('users').update(user.id, {
                posts_count: newCount
            });

            console.log(`✅ Added ${count} value to posts_count. New total: ${newCount}`);

            // Trigger checkLevelUp to see if it works naturally
            const levelSystem = new LevelSystem(pb);
            const result = await levelSystem.checkLevelUp(user.id);

            if (result && result.shouldLevelUp) {
                console.log('🎉 Natural Level Up triggered!', result);

                // Apply Level Up
                await pb.collection('users').update(user.id, {
                    level: result.newLevel,
                    level_progress: 0
                });

                if (window.toast) window.toast(`🎉 ¡Subiste a Nivel ${result.newLevel}: ${result.levelName}!`, 'success');
                if (window.showTokenCelebration) window.showTokenCelebration();

            } else {
                console.log('📊 Progress updated. Current level:', result ? result.newLevel : 'unknown');
            }

            await store.init();
            if (window.render) window.render();

        } catch (err) {
            console.error(err);
        }
    },

    /**
     * Print current level analysis
     */
    async analyzeUser() {
        const user = store.currentUser;
        if (!user) return console.log('No user');

        const levelSystem = new LevelSystem(pb);
        const info = await levelSystem.getUserLevelInfo(user.id);

        console.table({
            'Current Level': `${info.current.level} (${info.current.name})`,
            'Posts (Actual/Next)': `${info.stats.totalPosts} / ${info.next?.requirements.posts || 'MAX'}`,
            'Copies (Actual/Next)': `${info.stats.totalCopies} / ${info.next?.requirements.copies || 'MAX'}`,
            'Progress %': `${info.stats.progress}%`,
            'Next Level': info.next ? info.next.name : 'None'
        });

        return info;
    }
};

// Expose to window for console usage
window.LevelDebug = LevelDebug;
console.log('🛠️ LevelDebug tools loaded. Type "LevelDebug" to see options.');
