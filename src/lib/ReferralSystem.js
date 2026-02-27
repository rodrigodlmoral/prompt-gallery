// ReferralSystem.js
// Sistema completo de Referidos para PROMPT-GALLERY
// Versión: 2.0.0 (Integrado con LedgerService)

import { LedgerService } from './LedgerService.js';

export class ReferralSystem {
    constructor(pb, store) {
        this.pb = pb;
        this.store = store;
    }

    /**
     * Genera un código único de referido para un usuario
     */
    async generateReferralCode(userId) {
        try {
            // Generar código único basado en userId
            const hash = btoa(userId + Date.now()).substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
            const code = `PG${hash}`;

            // Verificar que no exista (muy improbable, pero por seguridad)
            const existing = await this.pb.collection('users').getFullList({
                filter: `referral_code="${code}"`
            });

            if (existing.length > 0) {
                // Si existe, intentar de nuevo
                return await this.generateReferralCode(userId);
            }

            // Actualizar usuario con el código
            await this.pb.collection('users').update(userId, {
                referral_code: code
            });

            return code;
        } catch (error) {
            console.error('Error generating referral code:', error);
            throw error;
        }
    }

    /**
     * Obtiene o crea el código de referido de un usuario
     */
    async getReferralCode(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId);

            // Si ya tiene código, retornarlo
            if (user.referral_code) {
                return user.referral_code;
            }

            // Si no tiene, generar uno nuevo
            return await this.generateReferralCode(userId);
        } catch (error) {
            console.error('Error getting referral code:', error);
            throw error;
        }
    }

    /**
     * Genera el link completo de referido
     */
    async getReferralLink(userId) {
        const code = await this.getReferralCode(userId);
        return `${window.location.origin}/register?ref=${code}`;
    }

    /**
     * Registra un nuevo referido
     */
    async registerReferral(referrerCode, newUserId) {
        try {
            // 1. Buscar el referidor por código
            const referrers = await this.pb.collection('users').getFullList({
                filter: `referral_code="${referrerCode}"`
            });

            if (referrers.length === 0) {
                console.warn('Referral code not found:', referrerCode);
                return null;
            }

            const referrer = referrers[0];

            // 2. Crear registro de referido (Admin bypass porque usuarios nuevos no tienen permisos cruzados aún)
            // Lo hacemos logueando como server si fuera necesario, o ya que tenemos auth, intentarlo.
            // Como eliminamos las reglas (son null/vacías), necesitamos bypasar los permisos si estamos desde cliente.
            // Aquí estamos asumiendo que el SDK Web puede crear por si mismo si las reglas lo permiten.
            // PERO, en nuestra FASE A cerramos las reglas ("").
            // Para solucionarlo temporalmente desde el front-end sin servidor NodeJS:
            console.log('Intentando registrar referido internamente...');

            const referral = await this.pb.collection('referrals').create({
                referrer: referrer.id,
                referred: newUserId,
                code: referrerCode,
                is_active: false,
                registered_at: new Date().toISOString()
            }, { requestKey: null }); // allow concurrent

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

    /**
     * Verifica si un usuario debe activar su referido
     * Se activa cuando el referido publica 5 prompts
     */
    async checkReferralActivation(userId) {
        try {
            // 1. Buscar si la persona actual ES un referido pendiente
            const referrals = await this.pb.collection('referrals').getFullList({
                filter: `referred="${userId}" && is_active=false`,
                requestKey: null
            });

            if (referrals.length === 0) {
                return { shouldActivate: false, reason: 'No pending referral found' };
            }

            // 2. Verificar si tiene 5 o más prompts usando la base de datos para contar *realmente*
            const promptStats = await this.pb.collection('prompts').getList(1, 1, {
                filter: `author="${userId}"`,
                fields: 'id',
                requestKey: null
            });

            if (promptStats.totalItems >= 5) {
                return {
                    shouldActivate: true,
                    referral: referrals[0]
                };
            }

            return {
                shouldActivate: false,
                reason: `Necesita ${5 - promptStats.totalItems} prompts más`
            };

        } catch (error) {
            console.error('Error checking referral activation:', error);
            return { shouldActivate: false, error: error.message };
        }
    }

    /**
     * Activa un referido y otorga el bonus al referidor
     */
    async activateReferral(referralId) {
        try {
            const referral = await this.pb.collection('referrals').getOne(referralId, {
                expand: 'referrer,referred',
                requestKey: null
            });

            // 1. Marcar referido como activo
            await this.pb.collection('referrals').update(referralId, {
                is_active: true,
                activated_at: new Date().toISOString()
            }, { requestKey: null });

            // 2. Otorgar bonus al referidor (5 PromptBits)
            const REFERRAL_BONUS = 5;

            const referrerUser = await this.pb.collection('users').getOne(referral.referrer, { requestKey: null });

            // Update tokens & referral count
            await this.pb.collection('users').update(referral.referrer, {
                tokens: (referrerUser.tokens || 0) + REFERRAL_BONUS,
                total_earned: (referrerUser.total_earned || 0) + REFERRAL_BONUS,
                active_referrals_count: (referrerUser.active_referrals_count || 0) + 1
            }, { requestKey: null });

            // Log to Ledger
            await LedgerService.systemReward(
                referral.referrer,
                REFERRAL_BONUS,
                'REFERRAL_BONUS',
                `Bono por referido activo: ${referral.expand?.referred?.name || 'Usuario'}`
            );

            // 3. Crear notificación para el referidor
            try {
                await this.pb.collection('activity_logs').create({
                    user: referral.referrer,
                    action: 'referral_activated',
                    details: {
                        referred_user: referral.referred,
                        referred_name: referral.expand?.referred?.name || 'Un invitado',
                        bonus_received: REFERRAL_BONUS,
                        timestamp: new Date().toISOString()
                    }
                }, { requestKey: null });
            } catch (logErr) { }

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

    /**
     * Obtiene los referidos de un usuario
     */
    async getUserReferrals(userId) {
        try {
            const referrals = await this.pb.collection('referrals').getFullList({
                filter: `referrer="${userId}"`,
                sort: '-registered_at',
                expand: 'referred',
                requestKey: null
            });

            return referrals.map(ref => ({
                id: ref.id,
                user: ref.expand?.referred || { name: 'Usuario Desconocido', avatar_url: '' },
                status: ref.is_active ? 'active' : 'pending',
                registeredAt: ref.registered_at,
                activatedAt: ref.activated_at,
                prompts_count: ref.expand?.referred?.prompts_count || 0
            }));

        } catch (error) {
            console.error('Error getting user referrals:', error);
            return [];
        }
    }

    /**
     * Obtiene estadísticas de referidos de un usuario
     */
    async getReferralStats(userId) {
        try {
            const allReferrals = await this.getUserReferrals(userId);

            const stats = {
                total: allReferrals.length,
                active: allReferrals.filter(r => r.status === 'active').length,
                pending: allReferrals.filter(r => r.status === 'pending').length,
                totalEarned: allReferrals.filter(r => r.status === 'active').length * 5 // 5 💎 por cada activo
            };

            return stats;
        } catch (error) {
            console.error('Error getting referral stats:', error);
            return null;
        }
    }

    /**
     * Verifica si un código de referido es válido
     */
    async isValidReferralCode(code) {
        if (!code) return false;
        try {
            const users = await this.pb.collection('users').getFullList({
                filter: `referral_code="${code}"`,
                requestKey: null
            });

            return users.length > 0;
        } catch (error) {
            console.error('Error validating referral code:', error);
            return false;
        }
    }
}

// Para debugging en consola
if (typeof window !== 'undefined') {
    window.ReferralSystem = ReferralSystem;
}
