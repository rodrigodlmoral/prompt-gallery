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

    const BANK_USER_ID = 'z44ierjl0thcczd';

    for (const uid of ids) {
        try {
            const user = await pb.collection('users').getOne(uid, { $autoCancel: false });

            // 1. Añadir tokens al usuario
            const currentTokens = user.tokens || 0;
            const newTokens = currentTokens + 205;
            await pb.collection('users').update(user.id, { tokens: newTokens }, { $autoCancel: false });

            // 2. Registrar en Ledger
            const txHash = "GIFT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            await pb.collection('ledger').create({
                from_user: BANK_USER_ID,
                to_user: user.id,
                amount: 205,
                type: 'GIFT',
                entry_type: 'CREDIT',
                tx_hash: txHash,
                description: 'GIFT pruebas Boost'
            }, { $autoCancel: false });

            console.log(`✅ Regalo de 205💎 enviado con éxito a: ${user.username} (${user.id}) | Nuevo Balance: ${newTokens}`);
        } catch (e) {
            console.error(`❌ Error procesando regalo para ${uid}:`, e.message, e.response || e);
        }
    }
}

run().catch(console.error);
