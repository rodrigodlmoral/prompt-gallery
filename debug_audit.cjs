const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const fs = require('fs');
const pbAdmin = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function testAudit() {
    await pbAdmin.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS, { $autoCancel: false });

    const BANK_USER_ID = 'z44ierjl0thcczd';
    const SYSTEM_IDS = [BANK_USER_ID];

    const allUsers = await pbAdmin.collection('users').getFullList({
        fields: 'id,username,name,tokens,level',
        $autoCancel: false
    });
    const ledgerEntries = await pbAdmin.collection('ledger').getFullList({
        fields: 'amount,type,entry_type,from_user,to_user,created,description',
        $autoCancel: false
    });

    const realUsers = allUsers.filter(u => u.id !== BANK_USER_ID);

    const userStats = {};
    realUsers.forEach(u => {
        userStats[u.id] = { id: u.id, username: u.name || u.username, actual: u.tokens || 0, minted: 0, spent: 0 };
    });

    let out = [];

    ledgerEntries.forEach(entry => {
        const amount = entry.amount || 0;
        let type = entry.type || 'UNKNOWN';

        const fromSystem = SYSTEM_IDS.includes(entry.from_user) || !entry.from_user;
        const toSystem = SYSTEM_IDS.includes(entry.to_user);
        const toRealUser = entry.to_user && userStats[entry.to_user];
        const fromRealUser = entry.from_user && userStats[entry.from_user];

        if (entry.type === 'GIFT') {
            out.push(`FOUND GIFT: amount=${amount} fromSystem=${fromSystem} toRealUser=${!!toRealUser} from_user="${entry.from_user}" to_user="${entry.to_user}"`);
        }

        // A) EMISSIONS (System -> User)
        if (fromSystem && toRealUser) {
            userStats[entry.to_user].minted += amount;
        }

        // B) SPENDING (User -> System)
        if (fromRealUser && (toSystem || ['PURCHASE', 'BOOST', 'FEE'].includes(type) || type === 'AUDIT_ADJUSTMENT')) {
            userStats[entry.from_user].spent += amount;
        }
    });

    Object.values(userStats).forEach(s => {
        const expected = s.minted - s.spent;
        const diff = s.actual - expected;
        if (Math.abs(diff) > 0.1) {
            out.push(`Discrepancy: ${s.username} (${s.id}) | Actual: ${s.actual} | Expected: ${expected} (Minted: ${s.minted}, Spent: ${s.spent}) | Diff: ${diff}`);
        }
    });

    fs.writeFileSync('debug_out.txt', out.join('\n'), 'utf8');
    console.log("Done");
}
testAudit().catch(console.error);
