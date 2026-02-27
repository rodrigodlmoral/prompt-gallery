const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    console.log('--- DEEP ECONOMY AUDIT ---');

    // 1. Fetch Users
    const users = await pb.collection('users').getFullList({
        fields: 'id,username,name,tokens',
        $autoCancel: false
    });
    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = {
            id: u.id,
            name: u.name || u.username,
            actual: u.tokens || 0,
            ledger_credit: 0,
            ledger_debit: 0
        };
    });

    // 2. Fetch Ledger
    const entries = await pb.collection('ledger').getFullList({
        fields: 'from_user,to_user,amount,entry_type,type',
        $autoCancel: false
    });

    entries.forEach(e => {
        const amount = e.amount || 0;

        // Handle Credits (money coming IN to someone)
        if (e.to_user && userMap[e.to_user]) {
            // It's a credit if:
            // - It's marked as CREDIT
            // - It's legacy and from system
            // - It's legacy and type is REGISTRATION_BONUS, GIFT, POST_REWARD, etc.
            if (e.entry_type === 'CREDIT' || !e.entry_type) {
                userMap[e.to_user].ledger_credit += amount;
            }
        }

        // Handle Debits (money going OUT of someone)
        if (e.from_user && userMap[e.from_user] && !SYSTEM_IDS.includes(e.from_user)) {
            // It's a debit if:
            // - It's marked as DEBIT
            // - It's legacy and type is PURCHASE, BOOST, TIP (as sender), etc.
            if (e.entry_type === 'DEBIT' || (!e.entry_type && (e.type === 'PURCHASE' || e.type === 'TIP' || e.type === 'BOOST'))) {
                userMap[e.from_user].ledger_debit += amount;
            }
        }
    });

    // 3. Analyze Discrepancies
    const anomalies = [];
    let totalActual = 0;
    let totalTheoretical = 0;

    Object.values(userMap).forEach(u => {
        if (SYSTEM_IDS.includes(u.id)) return;

        const theoretical = u.ledger_credit - u.ledger_debit;
        const diff = u.actual - theoretical;

        totalActual += u.actual;
        totalTheoretical += theoretical;

        if (Math.abs(diff) > 0) {
            anomalies.push({
                name: u.name,
                actual: u.actual,
                theoretical: theoretical,
                diff: diff,
                credit: u.ledger_credit,
                debit: u.ledger_debit
            });
        }
    });

    console.log(`Total Wallets (Actual):    ${totalActual} 💎`);
    console.log(`Total Ledger (Theoretical): ${totalTheoretical} 💎`);
    console.log(`Global Discrepancy:        ${totalActual - totalTheoretical} 💎`);

    console.log('\n--- TOP ANOMALIES ---');
    anomalies.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 20).forEach(a => {
        console.log(`${a.diff > 0 ? '💰' : '📉'} ${a.name.padEnd(20)} | Bal: ${a.actual} | Ledger: ${a.theoretical} | Diff: ${a.diff > 0 ? '+' : ''}${a.diff}`);
    });

    // 4. Inspect those specific "PURCHASE" entries again but globally
    const purchaseSum = entries.filter(e => e.type === 'PURCHASE').reduce((sum, e) => sum + (e.amount || 0), 0);
    console.log(`\nTotal value of 'PURCHASE' entries: ${purchaseSum} 💎`);
}

main().catch(err => {
    console.error(err);
});
