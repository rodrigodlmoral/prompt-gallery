/**
 * Economy Stats API (V5.3 - Pure Audit)
 * Refined per user requirements: 
 * - NO auto-balancing or hiding gaps.
 * - Report exact Ledger vs balance per user.
 * - Categorize reasons but keep the raw mismatch visible.
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { default: PocketBase } = await import('pocketbase');
        const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
        const PB_EMAIL = process.env.PB_ADMIN_EMAIL;
        const PB_PASS = process.env.PB_ADMIN_PASS;

        const pbAdmin = new PocketBase(PB_URL);
        try {
            await pbAdmin.admins.authWithPassword(PB_EMAIL, PB_PASS);
        } catch (authErr) {
            await pbAdmin.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASS);
        }

        const BANK_USER_ID = 'z44ierjl0thcczd';
        const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
        const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

        // 1. FETCH DATA
        const allUsers = await pbAdmin.collection('users').getFullList({
            fields: 'id,username,name,tokens,level',
            $autoCancel: false
        });
        const ledgerEntries = await pbAdmin.collection('ledger').getFullList({
            fields: 'amount,type,entry_type,from_user,to_user,created',
            $autoCancel: false
        });

        const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);
        const totalInCirculation = realUsers.reduce((sum, u) => sum + (u.tokens || 0), 0);

        // 2. RAW AUDIT Per User
        const userStats = {};
        realUsers.forEach(u => {
            userStats[u.id] = {
                id: u.id,
                username: u.name || u.username || 'Usuario',
                actual: u.tokens || 0,
                minted: 0,
                spent: 0
            };
        });

        const earnings = {};
        const spending = {};
        const monthlyMinted = {};

        ledgerEntries.forEach(entry => {
            const amount = entry.amount || 0;
            let type = entry.type || 'UNKNOWN';
            const hasEntryType = !!entry.entry_type;

            const fromSystem = SYSTEM_IDS.includes(entry.from_user) || !entry.from_user;
            const toSystem = SYSTEM_IDS.includes(entry.to_user);
            const toRealUser = entry.to_user && userStats[entry.to_user];
            const fromRealUser = entry.from_user && userStats[entry.from_user];

            // A) EMISSIONS (System -> User)
            if (fromSystem && toRealUser) {
                userStats[entry.to_user].minted += amount;

                let cleanType = type;
                if (type === 'PURCHASE' && !hasEntryType) cleanType = 'MIGRACION';
                if (type === 'TIP') cleanType = 'GIFT';

                if (!earnings[cleanType]) earnings[cleanType] = { count: 0, total: 0 };
                earnings[cleanType].count++;
                earnings[cleanType].total += amount;

                const month = (entry.created || '').substring(0, 7);
                if (month) monthlyMinted[month] = (monthlyMinted[month] || 0) + amount;
            }

            // B) SPENDING (User -> System)
            if (fromRealUser && (toSystem || ['PURCHASE', 'BOOST', 'FEE'].includes(type))) {
                userStats[entry.from_user].spent += amount;

                if (!spending[type]) spending[type] = { count: 0, total: 0 };
                spending[type].count++;
                spending[type].total += amount;
            }
        });

        // 3. IDENTIFY RAW DISCREPANCIES
        const rawDiscrepancies = [];
        Object.values(userStats).forEach(s => {
            const expected = s.minted - s.spent;
            const diff = s.actual - expected;
            if (diff !== 0) {
                let reason = "Discrepancia de flujo / Faltan registros";
                if (diff === -50) reason = "Duplicado Ledger (Backfill Error)";
                if (diff > 0) reason = "Tokens sin respaldo Ledger (Legacy/Regalo)";

                rawDiscrepancies.push({
                    username: s.username,
                    id: s.id,
                    actual: s.actual,
                    expected: expected,
                    diff: diff,
                    reason: reason
                });
            }
        });

        const totalMinted = Object.values(earnings).reduce((s, e) => s + e.total, 0);
        const totalSpent = Object.values(spending).reduce((s, e) => s + e.total, 0);
        const totalDiscrepancy = totalInCirculation - (totalMinted - totalSpent);

        const topHolders = realUsers
            .filter(u => (u.tokens || 0) > 0)
            .sort((a, b) => (b.tokens || 0) - (a.tokens || 0))
            .slice(0, 10)
            .map(u => ({
                username: u.name || u.username || 'Usuario',
                tokens: u.tokens || 0,
                level: u.level || 0
            }));

        const monthlyData = Object.entries(monthlyMinted)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({ month, amount }));

        return res.status(200).json({
            summary: {
                totalMinted,
                totalBurned: totalSpent,
                totalInCirculation,
                discrepancy: totalDiscrepancy,
                totalUsers: realUsers.length,
                totalUsersWithTokens: realUsers.filter(u => u.tokens > 0).length,
                totalLedgerEntries: ledgerEntries.length
            },
            earnings,
            spending,
            discrepancies: rawDiscrepancies,
            topHolders,
            monthlyData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ECONOMY-AUDIT] Global Error:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}
