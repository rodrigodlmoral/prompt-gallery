const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
const PB_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_PASS = process.env.PB_ADMIN_PASS;

const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function diag() {
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(PB_EMAIL, PB_PASS);

    const ledger = await pb.collection('ledger').getFullList({
        sort: '-created'
    });

    console.log("--- BUSCANDO MOVIMIENTOS HACIA EL SISTEMA (POSIBLES QUEMADOS) ---");
    const burns = ledger.filter(e => {
        const fromUser = e.from_user;
        const toSystem = SYSTEM_IDS.includes(e.to_user);
        const isFromRealUser = fromUser && !SYSTEM_IDS.includes(fromUser);
        return isFromRealUser && toSystem;
    });

    console.log(`Encontradas ${burns.length} entradas de Usuario -> Sistema`);
    console.table(burns.map(b => ({
        id: b.id,
        from: b.from_user,
        to: b.to_user,
        amount: b.amount,
        type: b.type,
        entry_type: b.entry_type,
        desc: b.description,
        created: b.created
    })));

    const users = await pb.collection('users').getFullList();
    const totalCirculation = users.filter(u => u.id !== BANK_USER_ID).reduce((s, u) => s + (u.tokens || 0), 0);
    console.log(`\nCirculación Real (Suma tokens usuarios): ${totalCirculation}`);
}
diag();
