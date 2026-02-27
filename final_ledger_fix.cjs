const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function reconcile() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);

    console.log("--- INICIANDO REGISTRO DE AJUSTES EN LEDGER ---");

    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    } catch (e) {
        console.log("Error auth admins, probando superusers...");
        await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    }

    const users = await pb.collection('users').getFullList();
    const ledger = await pb.collection('ledger').getFullList();

    const userStats = {};
    users.forEach(u => {
        if (SYSTEM_IDS.includes(u.id)) return;
        userStats[u.id] = {
            username: u.username,
            actual: u.tokens || 0,
            minted: 0,
            spent: 0
        };
    });

    ledger.forEach(e => {
        const fromSystem = SYSTEM_IDS.includes(e.from_user) || !e.from_user;
        const toSystem = SYSTEM_IDS.includes(e.to_user);

        if (fromSystem && e.to_user && userStats[e.to_user]) {
            userStats[e.to_user].minted += e.amount || 0;
        }
        if (!fromSystem && e.from_user && userStats[e.from_user] && toSystem) {
            userStats[e.from_user].spent += e.amount || 0;
        }
    });

    for (const [userId, s] of Object.entries(userStats)) {
        const expected = s.minted - s.spent;
        const diff = s.actual - expected;

        if (diff !== 0) {
            console.log(`Ajustando @${s.username}: Real=${s.actual}, Ledger=${expected}, Diferencia=${diff}`);

            // Si diff > 0: El usuario tiene más de lo que dice el ledger (Regalo Admin Legacy) -> CREDIT
            // Si diff < 0: El usuario tiene menos de lo que dice el ledger (Error de duplicado/backfill) -> DEBIT

            const amount = Math.abs(diff);
            const entryType = diff > 0 ? 'CREDIT' : 'DEBIT';
            const type = diff > 0 ? 'AUDIT_ADJUSTMENT' : 'AUDIT_ADJUSTMENT';
            const description = diff === -50 ? "Ajuste por duplicado en backfill" : "Ajuste histórico de auditoría";

            try {
                await pb.collection('ledger').create({
                    from_user: diff > 0 ? BANK_USER_ID : userId,
                    to_user: diff > 0 ? userId : BANK_USER_ID,
                    amount: amount,
                    type: type,
                    entry_type: entryType,
                    description: description,
                    tx_hash: 'AUDIT_FIX_' + Date.now()
                });
                console.log(`   ✅ Registro creado: ${entryType} ${amount}💎`);
            } catch (err) {
                console.log(`   ❌ Error ajustando @${s.username}:`, err.message);
            }
        }
    }

    console.log("--- RECONCILIACIÓN FINALIZADA ---");
}

reconcile();
