const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function diag() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    const users = await pb.collection('users').getFullList();
    const ledger = await pb.collection('ledger').getFullList();

    const stats = {};

    users.forEach(u => {
        if (SYSTEM_IDS.includes(u.id)) return;
        stats[u.id] = {
            username: u.username,
            actual: u.tokens || 0,
            minted: 0,
            burned: 0
        };
    });

    ledger.forEach(e => {
        const fromSystem = SYSTEM_IDS.includes(e.from_user) || !e.from_user;
        const toSystem = SYSTEM_IDS.includes(e.to_user);

        if (fromSystem && e.to_user && stats[e.to_user]) {
            stats[e.to_user].minted += e.amount || 0;
        }
        if (!fromSystem && e.from_user && stats[e.from_user] && toSystem) {
            stats[e.from_user].burned += e.amount || 0;
        }
    });

    const discrepancies = [];
    Object.entries(stats).forEach(([id, s]) => {
        const expected = s.minted - s.burned;
        if (expected !== s.actual) {
            discrepancies.push({
                username: s.username,
                actual: s.actual,
                expected,
                diff: s.actual - expected
            });
        }
    });

    console.log("--- USUARIOS CON DISCREPANCIA (Balance != Ledger) ---");
    discrepancies.sort((a, b) => a.diff - b.diff);
    console.table(discrepancies);

    const totalDiff = discrepancies.reduce((sum, d) => sum + d.diff, 0);
    console.log(`\nSuma total de diferencias: ${totalDiff}💎`);
}
diag();
