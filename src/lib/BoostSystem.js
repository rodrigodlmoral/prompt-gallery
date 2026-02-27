// BoostSystem.js
// Sistema completo de Boosts para PROMPT-GALLERY
// Versión: 1.0.0

import { BOOST_PRICES, BOOST_DURATIONS } from './boost-config.js';
import { LedgerService } from './LedgerService.js';

export class BoostSystem {
    constructor(pb, store) {
        this.pb = pb;
        this.store = store;
    }

    calculatePrice(type, userLevel) {
        const prices = BOOST_PRICES[type];
        if (!prices) return 0;

        // Return the price for the specific level, or the closest available
        if (prices[userLevel]) return prices[userLevel];

        const availableLevels = Object.keys(prices).map(Number).sort((a, b) => a - b);
        if (userLevel < availableLevels[0]) return prices[availableLevels[0]];
        return prices[availableLevels[availableLevels.length - 1]];
    }

    canPurchaseBoost(user, type) {
        const checks = { canBuy: true, reasons: [] };
        if (user.level < 1) {
            checks.canBuy = false;
            checks.reasons.push('Necesitas nivel 1 o superior');
        }
        if (type === 'super' && user.level < 3) {
            checks.canBuy = false;
            checks.reasons.push('Super Boost solo disponible desde nivel 3');
        }
        const price = this.calculatePrice(type, user.level);
        if (user.tokens < price) {
            checks.canBuy = false;
            checks.reasons.push(`Necesitas ${price} 💎 (tienes ${user.tokens} 💎)`);
        }
        return checks;
    }

    async getUserPrompts(userId) {
        try {
            const prompts = await this.pb.collection('prompts').getFullList({
                filter: `author="${userId}"`,
                fields: 'id,title,image,created,copy_count'
            });
            // Client-side sort to avoid PB 400 error for unindexed sort fields
            return prompts.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
        } catch (error) {
            console.error('Error getting user prompts:', error);
            return [];
        }
    }

    async purchaseBoost(userId, promptId, type) {
        try {
            const user = await this.pb.collection('users').getOne(userId);
            const canBuy = this.canPurchaseBoost(user, type);
            if (!canBuy.canBuy) throw new Error(canBuy.reasons.join('. '));

            const price = this.calculatePrice(type, user.level);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + BOOST_DURATIONS[type]);

            const boost = await this.pb.collection('boosts').create({
                user: userId,
                prompt: promptId,
                type: type,
                price_paid: price,
                purchased_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                is_active: true,
                views_count: 0,
                clicks_count: 0,
                notified_expiring: false
            });

            // Registro en el Ledger de Partida Doble
            const ledgerRes = await LedgerService.systemPayment(
                userId,
                price,
                'PURCHASE',
                `Boost ${this.getBoostTypeName(type)}: ${boost.id}`
            );

            if (!ledgerRes.success) {
                console.warn('[BOOST] Ledger recording failed, but purchase continued:', ledgerRes.error);
            }

            // Actualizar balance local del usuario inmediatamente
            await this.pb.collection('users').update(userId, {
                'tokens-': price,
                'total_spent+': price
            });

            if (this.store.currentUser && this.store.currentUser.id === userId) {
                this.store.currentUser.tokens = (this.store.currentUser.tokens || 0) - price;
                this.store.currentUser.total_spent = (this.store.currentUser.total_spent || 0) + price;
            }

            await this.pb.collection('boost_notifications').create({
                user: userId,
                boost: boost.id,
                type: 'activated',
                message: `Tu ${this.getBoostTypeName(type)} está activo y durará ${this.getDurationText(type)}`,
                is_read: false,
                action_url: `/profile?tab=marketplace`
            });

            if (this.store.currentUser && this.store.currentUser.id === userId) {
                this.store.currentUser.tokens = user.tokens - price;
            }

            return { success: true, boost, price, expiresAt };
        } catch (error) {
            console.error('❌ Error purchasing boost:', error);
            throw error;
        }
    }

    async getActiveBoosts(userId) {
        try {
            return await this.pb.collection('boosts').getFullList({
                filter: `user="${userId}" && is_active=true`,
                sort: '-purchased_at',
                expand: 'prompt',
                $autoCancel: false
            });
        } catch (error) {
            console.error('Error getting active boosts:', error);
            return [];
        }
    }

    async getActiveBoostsByType(type) {
        try {
            return await this.pb.collection('boosts').getFullList({
                filter: `type="${type}" && is_active=true`,
                sort: '-purchased_at',
                expand: 'prompt,user',
                $autoCancel: false
            });
        } catch (error) {
            console.error(`Error getting ${type} boosts:`, error);
            return [];
        }
    }

    async expireBoosts() {
        try {
            const now = new Date();
            const expiredBoosts = await this.pb.collection('boosts').getFullList({
                filter: `is_active=true && expires_at<="${now.toISOString()}"`,
                expand: 'user,prompt'
            });

            for (const boost of expiredBoosts) {
                await this.pb.collection('boosts').update(boost.id, { is_active: false });
                await this.pb.collection('boost_notifications').create({
                    user: boost.user,
                    boost: boost.id,
                    type: 'expired',
                    message: `Tu ${this.getBoostTypeName(boost.type)} ha expirado. Obtuvo ${boost.views_count || 0} vistas.`,
                    is_read: false,
                    action_url: `/profile?tab=marketplace&renew=${boost.id}`
                });
            }

            return expiredBoosts.length;
        } catch (error) {
            console.error('Error expiring boosts:', error);
            return 0;
        }
    }

    getBoostTypeName(type) {
        const names = { daily: 'TOP DIARIO', weekly: 'TOP SEMANAL', super: 'SUPERBOOST' };
        return names[type] || type;
    }

    getDurationText(type) {
        const durations = { daily: '24 horas', weekly: '7 días', super: '24 horas' };
        return durations[type] || 'tiempo limitado';
    }

    getBoostIcon(type) {
        const icons = { daily: '⚡', weekly: '🔥', super: '💫' };
        return icons[type] || '✨';
    }
}

if (typeof window !== 'undefined') window.BoostSystem = BoostSystem;
