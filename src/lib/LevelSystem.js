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
     * Calculate user's current level based on posts and copies
     * @param {number} totalPosts - Total prompts published
     * @param {number} totalCopies - Total copies received across all prompts
     * @returns {number} Current level (0-5)
     */
    calculateLevel(totalPosts, totalCopies) {
        let level = 0;
        LEVEL_REQS.forEach((req, idx) => {
            if (totalPosts >= req.posts && totalCopies >= req.copies) {
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
     * @returns {number} Progress percentage (0-100)
     */
    calculateProgress(currentLevel, totalPosts, totalCopies) {
        // Max level = 100% always
        if (currentLevel >= LEVEL_REQS.length - 1) return 100;

        const current = LEVEL_REQS[currentLevel];
        const next = LEVEL_REQS[currentLevel + 1];

        // Calculate progress for posts
        const postProgress = next.posts > current.posts
            ? Math.min(100, ((totalPosts - current.posts) / (next.posts - current.posts)) * 100)
            : 100;

        // Calculate progress for copies
        const copyProgress = next.copies > current.copies
            ? Math.min(100, ((totalCopies - current.copies) / (next.copies - current.copies)) * 100)
            : 100;

        // Progress = minimum of both (both requirements must be met)
        return Math.floor(Math.min(postProgress, copyProgress));
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

            // Get real counts from database
            const postsResult = await this.pb.collection('prompts').getList(1, 1, {
                filter: `author = "${userId}"`,
                fields: 'id'
            });
            const totalPosts = postsResult.totalItems || 0;

            const allPrompts = await this.pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                fields: 'copy_count'
            });
            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calculate level and progress
            const currentLevel = this.calculateLevel(totalPosts, totalCopies);
            const progress = this.calculateProgress(currentLevel, totalPosts, totalCopies);
            const levelInfo = this.getLevelInfo(currentLevel);
            const nextReqs = this.getNextLevelRequirements(currentLevel);

            return {
                current: {
                    level: currentLevel,
                    name: levelInfo.name,
                    icon: levelInfo.icon,
                    color: levelInfo.color,
                    benefits: levelInfo.benefits
                },
                stats: {
                    totalPosts,
                    totalCopies,
                    progress
                },
                next: nextReqs ? {
                    level: currentLevel + 1,
                    name: nextReqs.name,
                    requirements: {
                        posts: nextReqs.posts,
                        copies: nextReqs.copies
                    },
                    remaining: {
                        posts: Math.max(0, nextReqs.posts - totalPosts),
                        copies: Math.max(0, nextReqs.copies - totalCopies)
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

            // Get real counts
            const postsResult = await this.pb.collection('prompts').getList(1, 1, {
                filter: `author = "${userId}"`,
                fields: 'id'
            });
            const totalPosts = postsResult.totalItems || 0;

            const allPrompts = await this.pb.collection('prompts').getFullList({
                filter: `author = "${userId}"`,
                fields: 'copy_count'
            });
            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calculate new level
            const newLevel = this.calculateLevel(totalPosts, totalCopies);

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
