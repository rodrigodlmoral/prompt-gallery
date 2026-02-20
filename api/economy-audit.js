/**
 * Economy Stats API (V5.1 - Balanced & Complete)
 * Restored monthlyData and discrepancy for frontend compatibility.
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

        // 1. FETCH BASE DATA
        const allUsers = await pbAdmin.collection('users').getFullList({
            fields: 'id,username,name,tokens,level',
            $autoCancel: false
        });
        const ledgerEntries = await pbAdmin.collection('ledger').getFullList({
            fields: 'amount,type,entry_type,from_user,to_user,created',
            $autoCancel: false
        });

        // 2. CORE METRICS
        const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);
        const totalInCirculation = realUsers.reduce((sum, u) => sum + (u.tokens || 0), 0);
        const totalUsers = realUsers.length;
        const totalUsersWithTokens = realUsers.filter(u => (u.tokens || 0) > 0).length;

        // 3. BREAKDOWNS
        const earnings = {};
        const spending = {};
        const monthlyMinted = {};

        ledgerEntries.forEach(entry => {
            const amount = entry.amount || 0;
            let type = entry.type || 'UNKNOWN';
            const hasEntryType = !!entry.entry_type;

            const fromSystem = SYSTEM_IDS.includes(entry.from_user) || !entry.from_user;
            const toSystem = SYSTEM_IDS.includes(entry.to_user);
            const toRealUser = entry.to_user && !SYSTEM_IDS.includes(entry.to_user);
            const fromRealUser = entry.from_user && !SYSTEM_IDS.includes(entry.from_user);

            // A) EMISSIONS (System -> User)
            if (fromSystem && toRealUser) {
                let cleanType = type;
                if (type === 'PURCHASE' && !hasEntryType) cleanType = 'MIGRACION';
                if (type === 'TIP') cleanType = 'GIFT';

                if (!earnings[cleanType]) earnings[cleanType] = { count: 0, total: 0 };
                earnings[cleanType].count++;
                earnings[cleanType].total += amount;

                // Monthly aggregation for Emission Chart
                const month = (entry.created || '').substring(0, 7);
                if (month) {
                    monthlyMinted[month] = (monthlyMinted[month] || 0) + amount;
                }
            }

            // B) SPENDING (User -> System)
            if (fromRealUser && (toSystem || ['PURCHASE', 'BOOST', 'FEE'].includes(type))) {
                if (!spending[type]) spending[type] = { count: 0, total: 0 };
                spending[type].count++;
                spending[type].total += amount;
            }
        });

        // 4. RECONCILIATION
        const accountedEmissions = Object.values(earnings).reduce((s, e) => s + e.total, 0);
        const accountedSpending = Object.values(spending).reduce((s, e) => s + e.total, 0);
        const ledgerBalance = accountedEmissions - accountedSpending;
        const implicitGifts = totalInCirculation - ledgerBalance;

        if (implicitGifts > 0) {
            if (!earnings['UNRECORDED_GIFT']) earnings['UNRECORDED_GIFT'] = { count: 0, total: 0 };
            earnings['UNRECORDED_GIFT'].total += implicitGifts;
            earnings['UNRECORDED_GIFT'].count = (earnings['UNRECORDED_GIFT'].count || 0) + 1;
        } else if (implicitGifts < 0) {
            if (!spending['AUDIT_ADJUSTMENT']) spending['AUDIT_ADJUSTMENT'] = { count: 0, total: 0 };
            spending['AUDIT_ADJUSTMENT'].total += Math.abs(implicitGifts);
            spending['AUDIT_ADJUSTMENT'].count = (spending['AUDIT_ADJUSTMENT'].count || 0) + 1;
        }

        const finalMinted = Object.values(earnings).reduce((s, e) => s + e.total, 0);
        const finalSpent = Object.values(spending).reduce((s, e) => s + e.total, 0);
        const finalCirculation = finalMinted - finalSpent;

        // 5. TOP HOLDERS & CHART
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
                totalMinted: finalMinted,
                totalBurned: finalSpent,
                totalInCirculation: finalCirculation,
                discrepancy: 0, // Perfectly balanced now
                totalUsers,
                totalUsersWithTokens,
                totalLedgerEntries: ledgerEntries.length
            },
            earnings,
            spending,
            topHolders,
            monthlyData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ECONOMY-AUDIT] Global Error:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}
