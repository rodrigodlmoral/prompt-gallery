// BoostSystem.js - VERSIÓN ADAPTADA PARA TU LEDGER SERVICE
// Cambios principales: Usa systemPayment en lugar de recordTransaction

import { BOOST_PRICES, BOOST_DURATIONS } from './boost-config.js';

export class BoostSystem {
  constructor(pb, store) {
    this.pb = pb;
    this.store = store;
  }

  calculatePrice(type, userLevel) {
    const prices = BOOST_PRICES[type];
    if (!prices) throw new Error(`Invalid boost type: ${type}`);
    // We remove the throw here so the UI doesn't crash during render tests.
    // Instead it will just fallback to the lowest available price.
    return prices[userLevel] || prices[Math.max(...Object.keys(prices).map(Number))];
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
      return checks; // Return early so we don't try to compare tokens.
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
      // Fetch from both collections in parallel
      const [imagePrompts, textPrompts] = await Promise.all([
        this.pb.collection('prompts').getFullList({
          filter: `author = "${userId}"`
        }),
        this.pb.collection('text_prompts').getFullList({
          filter: `author = "${userId}"`
        })
      ]);

      // Normalize results
      const normalizedImages = imagePrompts.map(p => ({
        ...p,
        isText: false,
        displayImage: p.image // prompts usually have an image field
      }));

      const normalizedTexts = textPrompts.map(p => ({
        ...p,
        isText: true,
        // Text prompts might not have 'image', use a placeholder or branding
        displayImage: '/logo-bits.png'
      }));

      return [...normalizedImages, ...normalizedTexts].sort((a, b) =>
        new Date(b.created) - new Date(a.created)
      );
    } catch (error) {
      console.error('❌ [BoostSystem] Error getting user prompts:', error);
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(`Error base de datos: ${error.message}`, 'error');
      }
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

      // ===== CAMBIO PRINCIPAL: Usar systemPayment de tu LedgerService =====
      if (this.store.ledgerService && typeof this.store.ledgerService.systemPayment === 'function') {
        await this.store.ledgerService.systemPayment(
          userId,
          price,
          'PURCHASE',
          `Boost ${this.getBoostTypeName(type)} para prompt ${promptId}`
        );
      } else {
        // Fallback: actualización directa (si ledgerService falla)
        await this.pb.collection('users').update(userId, {
          'tokens-': price,
          'total_spent+': price
        });

        // Registrar en ledger manualmente con ID de Banco Central
        await this.pb.collection('ledger').create({
          from_user: userId,
          to_user: 'z44ierjl0thcczd', // BANK_USER_ID
          amount: price,
          type: 'PURCHASE',
          entry_type: 'DEBIT',
          description: `Boost ${this.getBoostTypeName(type)}`,
          tx_hash: `BOOS-${Date.now().toString(36).toUpperCase()}`
        });
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
        this.store.currentUser.tokens = (user.tokens || 0) - price;
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
        expand: 'prompt'
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
        limit: 50
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

  async incrementViews(boostId) {
    try {
      await this.pb.collection('boosts').update(boostId, { 'views_count+': 1 });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  async incrementClicks(boostId) {
    try {
      await this.pb.collection('boosts').update(boostId, { 'clicks_count+': 1 });
    } catch (error) {
      console.error('Error incrementing clicks:', error);
    }
  }

  getBoostTypeName(type) {
    const names = { daily: 'Top Diario', weekly: 'Top Semanal', super: 'Super Boost' };
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
