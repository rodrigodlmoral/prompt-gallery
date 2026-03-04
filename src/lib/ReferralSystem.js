// ReferralSystem.js - VERSIÓN ADAPTADA PARA TU LEDGER SERVICE
// Cambios principales: Usa systemReward en lugar de recordTransaction

export class ReferralSystem {
  constructor(pb, store) {
    this.pb = pb;
    this.store = store;
  }

  async generateReferralCode(userId) {
    try {
      const hash = btoa(userId + Date.now()).substring(0, 8).toUpperCase();
      const code = `PG${hash}`;

      const existing = await this.pb.collection('users').getFullList({
        filter: `referral_code="${code}"`
      });

      if (existing.length > 0) {
        return await this.generateReferralCode(userId);
      }

      await this.pb.collection('users').update(userId, {
        referral_code: code
      });

      return code;
    } catch (error) {
      console.error('Error generating referral code:', error);
      throw error;
    }
  }

  async getReferralCode(userId) {
    try {
      const user = await this.pb.collection('users').getOne(userId);
      
      if (user.referral_code) {
        return user.referral_code;
      }

      return await this.generateReferralCode(userId);
    } catch (error) {
      console.error('Error getting referral code:', error);
      throw error;
    }
  }

  async getReferralLink(userId) {
    const code = await this.getReferralCode(userId);
    return `${window.location.origin}/register?ref=${code}`;
  }

  async registerReferral(referrerCode, newUserId) {
    try {
      const referrers = await this.pb.collection('users').getFullList({
        filter: `referral_code="${referrerCode}"`
      });

      if (referrers.length === 0) {
        console.warn('Referral code not found:', referrerCode);
        return null;
      }

      const referrer = referrers[0];

      const referral = await this.pb.collection('referrals').create({
        referrer: referrer.id,
        referred: newUserId,
        code: referrerCode,
        is_active: false,
        registered_at: new Date().toISOString()
      });

      console.log('✅ Referral registered:', referral);

      return {
        success: true,
        referral: referral,
        referrer: referrer
      };

    } catch (error) {
      console.error('Error registering referral:', error);
      throw error;
    }
  }

  async checkReferralActivation(userId) {
    try {
      const user = await this.pb.collection('users').getOne(userId);

      if (user.prompts_count < 5) {
        return {
          shouldActivate: false,
          reason: `Necesita ${5 - user.prompts_count} prompts más`
        };
      }

      const referrals = await this.pb.collection('referrals').getFullList({
        filter: `referred="${userId}" && is_active=false`
      });

      if (referrals.length === 0) {
        return {
          shouldActivate: false,
          reason: 'No es un referido o ya está activo'
        };
      }

      return {
        shouldActivate: true,
        referral: referrals[0]
      };

    } catch (error) {
      console.error('Error checking referral activation:', error);
      return { shouldActivate: false, error: error.message };
    }
  }

  async activateReferral(referralId) {
    try {
      const referral = await this.pb.collection('referrals').getOne(referralId, {
        expand: 'referrer,referred'
      });

      await this.pb.collection('referrals').update(referralId, {
        is_active: true,
        activated_at: new Date().toISOString()
      });

      const REFERRAL_BONUS = 5;

      // ===== CAMBIO PRINCIPAL: Usar systemReward de tu LedgerService =====
      if (this.store.ledgerService) {
        // VERSIÓN A: Si tu método acepta (userId, amount, type, description)
        await this.store.ledgerService.systemReward(
          referral.referrer,
          REFERRAL_BONUS,
          'REFERRAL_BONUS',
          `Bonus por referido activo: ${referral.expand.referred.name}`
        );
        
        // VERSIÓN B: Si tu método acepta objeto { user, amount, type, description }
        // Descomenta esta y comenta la de arriba si tu método usa objetos:
        /*
        await this.store.ledgerService.systemReward({
          user: referral.referrer,
          amount: REFERRAL_BONUS,
          type: 'REFERRAL_BONUS',
          description: `Bonus por referido activo: ${referral.expand.referred.name}`
        });
        */
      } else {
        // Fallback
        await this.pb.collection('users').update(referral.referrer, {
          'tokens+': REFERRAL_BONUS,
          'total_earned+': REFERRAL_BONUS
        });

        await this.pb.collection('ledger').create({
          from_user: 'SYSTEM',
          to_user: referral.referrer,
          amount: REFERRAL_BONUS,
          type: 'REFERRAL_BONUS',
          entry_type: 'CREDIT',
          description: 'Bonus por referido activo'
        });
      }

      await this.pb.collection('users').update(referral.referrer, {
        'active_referrals_count+': 1
      });

      await this.pb.collection('activity_logs').create({
        user: referral.referrer,
        action: 'referral_activated',
        details: {
          referred_user: referral.referred,
          referred_name: referral.expand.referred.name,
          bonus_received: REFERRAL_BONUS,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`🎉 Referral activated! Referrer ${referral.referrer} earned ${REFERRAL_BONUS} 💎`);

      return {
        success: true,
        bonus: REFERRAL_BONUS
      };

    } catch (error) {
      console.error('Error activating referral:', error);
      throw error;
    }
  }

  async getUserReferrals(userId) {
    try {
      const referrals = await this.pb.collection('referrals').getFullList({
        filter: `referrer="${userId}"`,
        sort: '-registered_at',
        expand: 'referred'
      });

      return referrals.map(ref => ({
        id: ref.id,
        user: ref.expand.referred,
        status: ref.is_active ? 'active' : 'pending',
        registeredAt: ref.registered_at,
        activatedAt: ref.activated_at,
        prompts_count: ref.expand.referred.prompts_count || 0
      }));

    } catch (error) {
      console.error('Error getting user referrals:', error);
      return [];
    }
  }

  async getReferralStats(userId) {
    try {
      const allReferrals = await this.getUserReferrals(userId);

      const stats = {
        total: allReferrals.length,
        active: allReferrals.filter(r => r.status === 'active').length,
        pending: allReferrals.filter(r => r.status === 'pending').length,
        totalEarned: allReferrals.filter(r => r.status === 'active').length * 5
      };

      return stats;
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return null;
    }
  }

  async isValidReferralCode(code) {
    try {
      const users = await this.pb.collection('users').getFullList({
        filter: `referral_code="${code}"`
      });

      return users.length > 0;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.ReferralSystem = ReferralSystem;
}
