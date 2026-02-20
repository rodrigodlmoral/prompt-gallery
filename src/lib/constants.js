/**
 * ═══════════════════════════════════════════════════════════
 * CONSTANTS — Prompt Gallery Core Configuration
 * ═══════════════════════════════════════════════════════════
 *
 * Centralized constants for the application.
 * Do NOT hardcode IDs or config values elsewhere.
 */

/**
 * PocketBase User ID for the System Wallet (Central Bank).
 * All system rewards, bonuses, and fees flow through this account.
 *
 * Created by: init_central_bank.cjs
 * Username:   PromptBank_System
 * Email:      bank@promptgallery.system
 */
export const BANK_USER_ID = 'z44ierjl0thcczd';

/**
 * Valid ledger transaction types.
 * Used by LedgerService to validate writes.
 */
export const LEDGER_TYPES = {
    POST_REWARD: 'POST_REWARD',
    LEVEL_UP: 'LEVEL_UP',
    TIP: 'TIP',
    PURCHASE: 'PURCHASE',
    FEE: 'FEE',
    COPY_MILESTONE: 'COPY_MILESTONE',
    REGISTRATION_BONUS: 'REGISTRATION_BONUS',
    DAILY_LOGIN: 'DAILY_LOGIN',
    BOOST: 'BOOST',
    GIFT: 'GIFT',
    DEPOSIT: 'DEPOSIT' // Future: real money purchase of PromptBits
};

/**
 * Entry types for double-entry bookkeeping.
 */
export const ENTRY_TYPES = {
    DEBIT: 'DEBIT',   // Money going OUT of account
    CREDIT: 'CREDIT'  // Money coming IN to account
};
