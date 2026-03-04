/**
 * ═══════════════════════════════════════════════════════════
 * LEVEL SYSTEM - V3
 * ═══════════════════════════════════════════════════════════
 * 
 * Centralized class for all level-related logic.
 * Handles level calculations, progress tracking, and requirements.
 */

import { LEVEL_REQS } from '../store-final.js';
import { LedgerService } from './LedgerService.js';

export class LevelSystem {
    constructor(pb) {
        this.pb = pb;
    }

    /**
     * Calculate user's current level based on all stats
     * @param {number} totalPosts - Total prompts published
     * @param {number} totalCopies - Total copies received across all prompts
     * @param {number} referrals - Total active referrals
     * @param {number} reactions - Total reactions received
     * @param {number} reputation - Prompts with 20+ copies
     * @returns {number} Current level (0-5)
     */
    calculateLevel(totalPosts, totalCopies, referrals = 0, reactions = 0, reputation = 0) {
        let level = 0;
        LEVEL_REQS.forEach((req, idx) => {
            let meetsReqs = totalPosts >= req.posts && totalCopies >= req.copies;

            if (req.referrals !== undefined) {
                meetsReqs = meetsReqs && (referrals >= req.referrals);
            }
            if (req.referralsOrReactions !== undefined) {
                meetsReqs = meetsReqs && (
                    referrals >= req.referralsOrReactions.referrals ||
                    reactions >= req.referralsOrReactions.reactions
                );
            }
            if (req.reputation !== undefined) {
                meetsReqs = meetsReqs && (reputation >= req.reputation);
            }

            if (meetsReqs) {
                level = idx;
            }
        });
        return level;
    }

    /**
     * Calculate progress towards next level
     * @param {number} currentLevel - Current level
     * @param {number} totalPosts - Total prompts published
     * @param {number} totalCopies - Total copies received
     * @param {number} referrals - Total active referrals
     * @param {number} reactions - Total reactions received
     * @param {number} reputation - Prompts with 20+ copies
     * @returns {number} Progress percentage (0-100)
     */
    calculateProgress(currentLevel, totalPosts, totalCopies, referrals = 0, reactions = 0, reputation = 0) {
        // Max level = 100% always
        if (currentLevel >= LEVEL_REQS.length - 1) return 100;

        const current = LEVEL_REQS[currentLevel];
        const next = LEVEL_REQS[currentLevel + 1];

        const calcObjProg = (currentVal, nextReq, curReq) =>
            nextReq > (curReq || 0) ? Math.min(100, Math.max(0, ((currentVal - (curReq || 0)) / (nextReq - (curReq || 0))) * 100)) : 100;

        const postProgress = calcObjProg(totalPosts, next.posts, current.posts);
        const copyProgress = calcObjProg(totalCopies, next.copies, current.copies);

        // Basic progress is min of posts and copies
        let progress = Math.floor(Math.min(postProgress, copyProgress));

        // Evaluate extra conditions if next level requires them
        if (next.referrals !== undefined) {
            const refProg = calcObjProg(referrals, next.referrals, current.referrals);
            progress = Math.min(progress, refProg);
        }

        if (next.referralsOrReactions !== undefined) {
            const refProg = calcObjProg(referrals, next.referralsOrReactions.referrals, current.referralsOrReactions?.referrals);
            const reactProg = calcObjProg(reactions, next.referralsOrReactions.reactions, current.referralsOrReactions?.reactions);
            progress = Math.min(progress, Math.max(refProg, reactProg)); // Only one needs to be met
        }

        if (next.reputation !== undefined) {
            const repProg = calcObjProg(reputation, next.reputation, current.reputation);
            progress = Math.min(progress, repProg);
        }

        return Math.floor(progress);
    }

    /**
     * Get level configuration
     * @param {number} level - Level number (0-5)
     * @returns {object} Level configuration
     */
    getLevelInfo(level) {
        return LEVEL_REQS[level] || LEVEL_REQS[0];
    }

    /**
     * Get requirements for next level
     * @param {number} currentLevel - Current level
     * @returns {object|null} Next level requirements or null if max level
     */
    getNextLevelRequirements(currentLevel) {
        if (currentLevel >= LEVEL_REQS.length - 1) return null;
        return LEVEL_REQS[currentLevel + 1];
    }

    /**
     * Get complete user level info
     * @param {string} userId - User ID
     * @returns {Promise<object>} Complete level information
     */
    async getUserLevelInfo(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId);

            // Get real counts from database (image prompts)
            const postsResult = await this.pb.collection('prompts').getList(1, 1, {
                filter: `author = "${userId}"`,
                fields: 'id'
            });
            let totalPosts = postsResult.totalItems || 0;

            const allPrompts = await this.pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                fields: 'copy_count,reactions'
            });

            // Also count text prompts
            try {
                const textPostsResult = await this.pb.collection('text_prompts').getList(1, 1, {
                    filter: `author = "${userId}"`,
                    fields: 'id'
                });
                totalPosts += (textPostsResult.totalItems || 0);

                const allTextPrompts = await this.pb.collection('text_prompts').getFullList({
                    filter: `author = "${userId}"`,
                    fields: 'copy_count,reactions'
                });
                allPrompts.push(...allTextPrompts);
            } catch (e) { /* text_prompts collection might not exist yet */ }

            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // New metrics
            const referrals = user.active_referrals_count || 0;
            const reactions = allPrompts.reduce((sum, p) => {
                const r = p.reactions || {};
                return sum + Object.keys(r).filter(k => k !== '_u').reduce((s, k) => s + (r[k] || 0), 0);
            }, 0);
            const reputation = allPrompts.filter(p => (p.copy_count || 0) >= 20).length;

            // Calculate level and progress
            const currentLevel = this.calculateLevel(totalPosts, totalCopies, referrals, reactions, reputation);
            const progress = this.calculateProgress(currentLevel, totalPosts, totalCopies, referrals, reactions, reputation);

            // Fix: User's actual level in DB might be higher (we never downgrade)
            const actualLevel = Math.max(user.level || 0, currentLevel);

            const levelInfo = this.getLevelInfo(actualLevel);
            const nextReqs = this.getNextLevelRequirements(actualLevel);

            return {
                current: {
                    level: actualLevel,
                    name: levelInfo.name,
                    icon: levelInfo.icon,
                    color: levelInfo.color,
                    benefits: levelInfo.benefits
                },
                stats: {
                    totalPosts,
                    totalCopies,
                    referrals,
                    reactions,
                    reputation,
                    progress
                },
                next: nextReqs ? {
                    level: actualLevel + 1,
                    name: nextReqs.name,
                    requirements: {
                        posts: nextReqs.posts,
                        copies: nextReqs.copies,
                        referrals: nextReqs.referrals,
                        referralsOrReactions: nextReqs.referralsOrReactions,
                        reputation: nextReqs.reputation
                    },
                    remaining: {
                        posts: Math.max(0, nextReqs.posts - totalPosts),
                        copies: Math.max(0, nextReqs.copies - totalCopies),
                        referrals: nextReqs.referrals !== undefined ? Math.max(0, nextReqs.referrals - referrals) : undefined
                    }
                } : null
            };
        } catch (error) {
            console.error('[LevelSystem] Error getting user level info:', error);
            // Return default Level 0 on error
            return {
                current: {
                    level: 0,
                    name: 'Explorador',
                    icon: '🛡️',
                    color: '#22c55e',
                    benefits: LEVEL_REQS[0].benefits
                },
                stats: {
                    totalPosts: 0,
                    totalCopies: 0,
                    referrals: 0,
                    reactions: 0,
                    reputation: 0,
                    progress: 0
                },
                next: {
                    level: 1,
                    name: 'Novato',
                    requirements: {
                        posts: 5,
                        copies: 0
                    },
                    remaining: {
                        posts: 5,
                        copies: 0
                    }
                }
            };
        }
    }

    /**
     * Check if user should level up and return new level if so
     * @param {string} userId - User ID
     * @returns {Promise<{shouldLevelUp: boolean, oldLevel: number, newLevel: number}|null>}
     */
    async checkLevelUp(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId);
            const oldLevel = user.level || 0;

            // Get real counts (image prompts)
            const postsResult = await this.pb.collection('prompts').getList(1, 1, {
                filter: `author = "${userId}"`,
                fields: 'id'
            });
            let totalPosts = postsResult.totalItems || 0;

            const allPrompts = await this.pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                fields: 'copy_count,reactions'
            });

            // Also count text prompts
            try {
                const textPostsResult = await this.pb.collection('text_prompts').getList(1, 1, {
                    filter: `author = "${userId}"`,
                    fields: 'id'
                });
                totalPosts += (textPostsResult.totalItems || 0);

                const allTextPrompts = await this.pb.collection('text_prompts').getFullList({
                    filter: `author = "${userId}"`,
                    fields: 'copy_count,reactions'
                });
                allPrompts.push(...allTextPrompts);
            } catch (e) { /* text_prompts collection might not exist yet */ }

            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // New metrics
            const referrals = user.active_referrals_count || 0;
            const reactions = allPrompts.reduce((sum, p) => {
                const r = p.reactions || {};
                return sum + Object.keys(r).filter(k => k !== '_u').reduce((s, k) => s + (r[k] || 0), 0);
            }, 0);
            const reputation = allPrompts.filter(p => (p.copy_count || 0) >= 20).length;

            // Calculate new level
            const newLevel = this.calculateLevel(totalPosts, totalCopies, referrals, reactions, reputation);

            if (newLevel > oldLevel) {
                return {
                    shouldLevelUp: true,
                    oldLevel,
                    newLevel,
                    levelName: LEVEL_REQS[newLevel].name
                };
            }

            return { shouldLevelUp: false, oldLevel, newLevel: oldLevel };
        } catch (error) {
            console.error('[LevelSystem] Error checking level up:', error);
            return null;
        }
    }

    /**
     * Execute the level up transaction in the database
     * @param {string} userId - User ID
     * @returns {Promise<{success: boolean, msg: string, newLevel: number, bonus: number}>}
     */
    async executeLevelUp(userId) {
        try {
            const check = await this.checkLevelUp(userId);
            if (!check || !check.shouldLevelUp) {
                return { success: false, msg: "No cumples los requisitos para subir de nivel aún." };
            }

            const { newLevel, oldLevel, levelName } = check;
            const lvlInfo = LEVEL_REQS[newLevel];
            const bonusMatch = lvlInfo.benefits.find(b => b.includes('Bonus: +'))?.match(/\d+/);
            const bonusTokens = bonusMatch ? parseInt(bonusMatch[0]) : 0;

            // ⚠️ Auditoría Económica (v3.2)
            try {
                const user = await this.pb.collection('users').getOne(userId);
                const currentTokens = user.tokens || 0;
                const currentEarned = user.total_earned || 0;
                const currentRewards = user.total_rewards || 0;

                // 1. Update User (Level + Tokens + Rewards)
                await this.pb.collection('users').update(userId, {
                    level: newLevel,
                    tokens: currentTokens + bonusTokens,
                    total_earned: currentEarned + bonusTokens,
                    total_rewards: currentRewards + bonusTokens
                });

                // 2. Record in Ledger — Phase C: Double-Entry via LedgerService
                await LedgerService.systemReward(
                    userId, bonusTokens, 'LEVEL_UP',
                    `Bono: Subida al Nivel ${newLevel} (${levelName})`
                );

                // 3. Activity Log
                try {
                    await this.pb.collection('activity_logs').create({
                        user: userId,
                        action: 'level_up',
                        details: {
                            oldLevel,
                            newLevel,
                            levelName,
                            bonusTokens
                        }
                    });
                } catch (logErr) {
                    console.warn("[LevelSystem] Activity log failed.", logErr);
                }
            } catch (err) {
                console.error("[LevelSystem] Critical economic update failure:", err);
            }

            console.log(`[LevelSystem] 🎉 User ${userId} promoted to Level ${newLevel} (+${bonusTokens} 💎)`);

            return {
                success: true,
                msg: `¡Felicidades! Has subido al Nivel ${newLevel} (${levelName}).`,
                newLevel,
                bonus: bonusTokens
            };

        } catch (err) {
            console.error('[LevelSystem] Error executes level up:', err);
            return { success: false, msg: "Error al procesar la subida de nivel: " + err.message };
        }
    }
}
