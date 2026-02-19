/**
 * ═══════════════════════════════════════════════════════════
 * LEDGER SERVICE — Double-Entry Bookkeeping for PromptBits
 * ═══════════════════════════════════════════════════════════
 *
 * This is the SINGLE point of entry for all ledger writes.
 * No other file should call `pb.collection('ledger').create()`
 * directly. Always use LedgerService instead.
 *
 * DESIGN PRINCIPLES:
 *   1. Every token has an origin and a destination.
 *   2. System rewards come FROM the Central Bank wallet.
 *   3. Transfers between users create paired DEBIT/CREDIT entries.
 *   4. Failures in ledger recording NEVER block the primary action.
 *   5. All entries share a tx_hash for traceability.
 *   6. Legacy records (from_user: null) remain untouched and valid.
 *
 * USAGE:
 *   import { LedgerService } from './LedgerService.js';
 *
 *   // System reward (e.g. post reward, level bonus)
 *   await LedgerService.systemReward(userId, 5, 'POST_REWARD', 'Published: My Prompt');
 *
 *   // Transfer between users (e.g. tips)
 *   await LedgerService.transfer(senderId, receiverId, 10, 'Tip for great prompt');
 *
 *   // For Vercel serverless (pass pbAdmin instance):
 *   await LedgerService.transfer(senderId, receiverId, 10, 'Tip', { pbInstance: pbAdmin });
 */

import { pb } from '../pocketbase.js';
import { BANK_USER_ID, ENTRY_TYPES } from './constants.js';

export class LedgerService {
    /**
     * Generate a unique transaction hash.
     * Format: PREFIX-TIMESTAMP_BASE36-RANDOM_HEX
     * @param {string} prefix - Short prefix, max 4 chars (e.g. 'PR', 'LVL', 'TIP')
     * @returns {string}
     */
    static _generateTxHash(prefix = 'TX') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Get the PocketBase instance to use.
     * Allows Vercel serverless functions to pass their own admin instance.
     * @param {object} [options]
     * @param {object} [options.pbInstance] - PocketBase instance to use instead of default
     * @returns {object} PocketBase instance
     */
    static _getPb(options = {}) {
        return options.pbInstance || pb;
    }

    /**
     * Record a System Reward (minting).
     *
     * Creates a CREDIT entry for the user (money in) with the Central Bank
     * as the source. The Bank's balance goes negative, representing total
     * tokens minted/in circulation.
     *
     * This method is FIRE-AND-FORGET safe: errors are caught and logged,
     * never thrown, so the calling code's primary action is never blocked.
     *
     * @param {string} userId - Recipient user ID
     * @param {number} amount - Amount of PromptBits to award (must be > 0)
     * @param {string} type - Transaction type (e.g. 'POST_REWARD', 'LEVEL_UP', 'COPY_MILESTONE')
     * @param {string} description - Human-readable description
     * @param {object} [options] - Optional config
     * @param {object} [options.pbInstance] - PocketBase instance override (for serverless)
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    static async systemReward(userId, amount, type, description, options = {}) {
        if (!userId || !amount || amount <= 0) {
            console.warn('[LEDGER] Invalid systemReward params:', { userId, amount, type });
            return { success: false, error: 'Invalid parameters' };
        }

        const pocketbase = this._getPb(options);
        const txHash = this._generateTxHash(type.substring(0, 4));

        try {
            // CREDIT entry: System pays User
            await pocketbase.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: userId,
                amount: parseInt(amount),
                type: type,
                description: description,
                tx_hash: txHash,
                entry_type: ENTRY_TYPES.CREDIT
            });

            console.log(`[LEDGER] ✅ ${type}: +${amount} 💎 → User ${userId.substring(0, 6)}... (TX: ${txHash})`);
            return { success: true, txHash };
        } catch (err) {
            console.error(`[LEDGER] ❌ systemReward failed:`, err.message || err);
            // NEVER throw — the primary action (publish, level up, etc.) must not be blocked
            return { success: false, error: err.message };
        }
    }

    /**
     * Record a User-to-User Transfer (P2P).
     *
     * Creates TWO paired entries:
     *   1. DEBIT:  Money leaves the sender
     *   2. CREDIT: Money arrives to the receiver
     * Both share the same tx_hash for easy reconciliation.
     *
     * @param {string} senderId - Sender user ID
     * @param {string} receiverId - Recipient user ID
     * @param {number} amount - Amount of PromptBits (must be > 0)
     * @param {string} description - Human-readable description
     * @param {object} [options] - Optional config
     * @param {object} [options.pbInstance] - PocketBase instance override
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    static async transfer(senderId, receiverId, amount, description, options = {}) {
        if (!senderId || !receiverId || !amount || amount <= 0) {
            console.warn('[LEDGER] Invalid transfer params:', { senderId, receiverId, amount });
            return { success: false, error: 'Invalid parameters' };
        }

        if (senderId === receiverId) {
            console.warn('[LEDGER] Self-transfer blocked');
            return { success: false, error: 'Cannot transfer to self' };
        }

        const pocketbase = this._getPb(options);
        const txHash = this._generateTxHash('TIP');

        try {
            // Entry 1: DEBIT — Sender loses tokens
            await pocketbase.collection('ledger').create({
                from_user: senderId,
                to_user: receiverId,
                amount: parseInt(amount),
                type: 'TIP',
                description: description,
                tx_hash: txHash,
                entry_type: ENTRY_TYPES.DEBIT
            });

            // Entry 2: CREDIT — Receiver gains tokens
            await pocketbase.collection('ledger').create({
                from_user: senderId,
                to_user: receiverId,
                amount: parseInt(amount),
                type: 'TIP',
                description: description,
                tx_hash: txHash,
                entry_type: ENTRY_TYPES.CREDIT
            });

            console.log(`[LEDGER] ✅ TIP: ${senderId.substring(0, 6)}... → ${receiverId.substring(0, 6)}... (${amount} 💎, TX: ${txHash})`);
            return { success: true, txHash };
        } catch (err) {
            console.error(`[LEDGER] ❌ transfer failed:`, err.message || err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Record a User-to-System payment (e.g. Boost, Purchase).
     *
     * The user pays and the Central Bank receives.
     *
     * @param {string} userId - Paying user ID
     * @param {number} amount - Amount spent (must be > 0)
     * @param {string} type - Transaction type (e.g. 'BOOST', 'PURCHASE', 'FEE')
     * @param {string} description - Human-readable description
     * @param {object} [options] - Optional config
     * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
     */
    static async systemPayment(userId, amount, type, description, options = {}) {
        if (!userId || !amount || amount <= 0) {
            console.warn('[LEDGER] Invalid systemPayment params:', { userId, amount, type });
            return { success: false, error: 'Invalid parameters' };
        }

        const pocketbase = this._getPb(options);
        const txHash = this._generateTxHash(type.substring(0, 4));

        try {
            // DEBIT entry: User pays the System
            await pocketbase.collection('ledger').create({
                from_user: userId,
                to_user: BANK_USER_ID,
                amount: parseInt(amount),
                type: type,
                description: description,
                tx_hash: txHash,
                entry_type: ENTRY_TYPES.DEBIT
            });

            console.log(`[LEDGER] ✅ ${type}: -${amount} 💎 ← User ${userId.substring(0, 6)}... (TX: ${txHash})`);
            return { success: true, txHash };
        } catch (err) {
            console.error(`[LEDGER] ❌ systemPayment failed:`, err.message || err);
            return { success: false, error: err.message };
        }
    }
}
