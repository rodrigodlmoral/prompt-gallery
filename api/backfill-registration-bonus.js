import PocketBase from 'pocketbase';

/**
 * Backfill Registration Bonus Ledger Entries
 * 
 * One-time migration: Creates REGISTRATION_BONUS ledger entries for all
 * existing users who don't already have one. This eliminates the discrepancy
 * between user token balances and ledger totals.
 * 
 * Safe: Read-only on users, only CREATES new ledger entries. Does NOT 
 * modify any user balances or existing data.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Use POST to execute backfill' });
    }

    try {
        const pbAdmin = new PocketBase(process.env.PB_URL);
        await pbAdmin.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        const BANK_USER_ID = 'z44ierjl0thcczd';
        const BONUS_AMOUNT = 50;

        // 1. Get ALL users (except bank)
        const allUsers = await pbAdmin.collection('users').getFullList({
            fields: 'id,username,created',
            $autoCancel: false
        });
        const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);

        // 2. Get ALL existing REGISTRATION_BONUS ledger entries
        const existingBonuses = await pbAdmin.collection('ledger').getFullList({
            filter: `type = "REGISTRATION_BONUS"`,
            fields: 'to_user',
            $autoCancel: false
        });
        const usersWithBonus = new Set(existingBonuses.map(e => e.to_user));

        // 3. Find users missing their registration bonus entry
        const missingUsers = realUsers.filter(u => !usersWithBonus.has(u.id));

        if (missingUsers.length === 0) {
            return res.status(200).json({
                message: 'No backfill needed — all users already have REGISTRATION_BONUS entries',
                totalUsers: realUsers.length,
                alreadyHaveBonus: usersWithBonus.size,
                backfilled: 0
            });
        }

        // 4. Create ledger entries for each missing user
        let success = 0;
        let failed = 0;
        const errors = [];

        for (const user of missingUsers) {
            try {
                const timestamp = Date.now().toString(36).toUpperCase();
                const random = Math.random().toString(36).substring(2, 8).toUpperCase();
                const txHash = `REGB-${timestamp}-${random}`;

                await pbAdmin.collection('ledger').create({
                    from_user: BANK_USER_ID,
                    to_user: user.id,
                    amount: BONUS_AMOUNT,
                    type: 'REGISTRATION_BONUS',
                    description: `Bono de bienvenida para @${user.username || 'Usuario'} (backfill)`,
                    tx_hash: txHash,
                    entry_type: 'CREDIT'
                });
                success++;
            } catch (err) {
                failed++;
                errors.push({ userId: user.id, username: user.username, error: err.message });
            }
        }

        return res.status(200).json({
            message: `Backfill complete`,
            totalUsers: realUsers.length,
            alreadyHadBonus: usersWithBonus.size,
            backfilled: success,
            failed,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[BACKFILL] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
