import PocketBase from 'pocketbase';

/**
 * Economy Stats API — Reads-only from Ledger + Users
 * Returns aggregated economy metrics for the Admin Economy tab.
 *
 * Auth: Admin-only via PB admin credentials (server-side)
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Connect as Admin
        const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
        const PB_EMAIL = process.env.PB_ADMIN_EMAIL;
        const PB_PASS = process.env.PB_ADMIN_PASS;

        const pbAdmin = new PocketBase(PB_URL);
        await pbAdmin.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASS);

        const BANK_USER_ID = 'z44ierjl0thcczd';
        const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
        const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

        // 2. Fetch ALL users (for circulation calc + top holders)
        const allUsers = await pbAdmin.collection('users').getFullList({
            fields: 'id,username,name,tokens,total_earned,total_spent,total_rewards,level,created',
            $autoCancel: false
        });

        // 3. Calculate circulation (exclude bank user)
        const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);
        const totalInCirculation = realUsers.reduce((sum, u) => sum + (u.tokens || 0), 0);
        const totalUsersWithTokens = realUsers.filter(u => (u.tokens || 0) > 0).length;
        const totalUsers = realUsers.length;

        // 4. Fetch ALL ledger entries for aggregation
        const ledgerEntries = await pbAdmin.collection('ledger').getFullList({
            fields: 'amount,type,entry_type,from_user,to_user,created',
            $autoCancel: false
        });

        // 5. Calculate minted (CREDIT entries FROM bank)
        let totalMinted = 0;
        let totalBurned = 0;
        const breakdown = {};
        const monthlyMinted = {};

        ledgerEntries.forEach(entry => {
            const amount = entry.amount || 0;
            let type = entry.type || 'UNKNOWN';
            const hasEntryType = !!entry.entry_type;

            // In legacy migration, PURCHASE was used as a MIGRATION marker
            if (type === 'PURCHASE' && !hasEntryType) {
                type = 'MIGRACIÓN';
            }

            if (hasEntryType) {
                // Modern double-entry records
                if (SYSTEM_IDS.includes(entry.from_user) && !SYSTEM_IDS.includes(entry.to_user) && entry.entry_type === 'CREDIT') {
                    // System -> User = New tokens in circulation
                    totalMinted += amount;
                }
                if (!SYSTEM_IDS.includes(entry.from_user) && SYSTEM_IDS.includes(entry.to_user) && entry.entry_type === 'DEBIT') {
                    // User -> System = Tokens removed from circulation
                    totalBurned += amount;
                }
            } else {
                // Legacy single-entry records (no entry_type)
                // Minting: From System/Null TO a real user
                if ((SYSTEM_IDS.includes(entry.from_user) || !entry.from_user) && !SYSTEM_IDS.includes(entry.to_user)) {
                    totalMinted += amount;
                }
                // Burning: From a real user TO the system
                else if (!SYSTEM_IDS.includes(entry.from_user) && (SYSTEM_IDS.includes(entry.to_user) || type === 'PURCHASE' || type === 'BOOST' || type === 'FEE')) {
                    totalBurned += amount;
                }
            }

            // Monthly minting aggregation
            const isMinting = (hasEntryType && SYSTEM_IDS.includes(entry.from_user) && entry.entry_type === 'CREDIT')
                || (!hasEntryType && SYSTEM_IDS.includes(entry.from_user));

            if (isMinting) {
                const month = (entry.created || '').substring(0, 7);
                if (month) {
                    monthlyMinted[month] = (monthlyMinted[month] || 0) + amount;
                }
            }

            // Type breakdown
            if (entry.entry_type === 'CREDIT' || !entry.entry_type) {
                if (!breakdown[type]) {
                    breakdown[type] = { count: 0, total: 0 };
                }
                breakdown[type].count++;
                breakdown[type].total += amount;
            }
        });

        // 6. Top 10 holders
        const topHolders = realUsers
            .filter(u => (u.tokens || 0) > 0)
            .sort((a, b) => (b.tokens || 0) - (a.tokens || 0))
            .slice(0, 10)
            .map(u => ({
                username: u.name || u.username || 'N/A',
                tokens: u.tokens || 0,
                level: u.level || 0,
                total_earned: u.total_earned || 0
            }));

        // 7. Balance validation
        // Expected: minted - burned = inCirculation
        // If discrepancy > 0: tokens unaccounted for (leaked or pre-ledger)
        const expectedCirculation = totalMinted - totalBurned;
        const discrepancy = totalInCirculation - expectedCirculation;

        // 8. Monthly breakdown (sorted)
        const monthlyData = Object.entries(monthlyMinted)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount }));

        return res.status(200).json({
            summary: {
                totalMinted,
                totalBurned,
                totalInCirculation,
                expectedCirculation,
                discrepancy,
                totalUsers,
                totalUsersWithTokens,
                totalLedgerEntries: ledgerEntries.length
            },
            breakdown,
            topHolders,
            monthlyData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ECONOMY-STATS] Error:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}
