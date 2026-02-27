const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

const ids = [
    'skv9nch5fehjnyq', // valentine
    '1fmcah0igjzburh', // smangel97
    '5vdkh65xvoaj1y1', // night9203
    'm2fevxonc4ewml5'  // Damaso574
];

async function run() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS, { $autoCancel: false });

    for (const uid of ids) {
        try {
            const user = await pb.collection('users').getOne(uid, { $autoCancel: false });

            // Subtract the rogue 205 tokens that were added before the ledger crash
            const currentTokens = user.tokens || 0;
            const newTokens = currentTokens - 205;

            await pb.collection('users').update(user.id, { tokens: newTokens }, { $autoCancel: false });

            console.log(`✅ Corregido balance de: ${user.username} (${user.id}) | Restado 205. Nuevo Balance: ${newTokens}`);
        } catch (e) {
            console.error(`❌ Error corrigiendo ${uid}:`, e.message);
        }
    }
}

run().catch(console.error);
