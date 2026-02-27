const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const BANK_USER_ID = 'z44ierjl0thcczd';
const LEGACY_ADMIN_ID = 'rkmrhmgh067x7un';
const SYSTEM_IDS = [BANK_USER_ID, LEGACY_ADMIN_ID];

async function diag() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    const ledger = await pb.collection('ledger').getFullList();

    console.log("--- ENTRADAS NO SISTÉMICAS (From != System) ---");
    const internal = ledger.filter(e => e.from_user && !SYSTEM_IDS.includes(e.from_user));

    const p2p = [];
    const burns = [];
    const others = [];

    internal.forEach(e => {
        const toSystem = SYSTEM_IDS.includes(e.to_user);
        const toNull = !e.to_user;
        const type = e.type || 'UNKNOWN';

        if (toSystem) {
            burns.push(e);
        } else if (toNull && ['PURCHASE', 'BOOST', 'FEE'].includes(type)) {
            burns.push(e);
        } else if (e.to_user && !SYSTEM_IDS.includes(e.to_user)) {
            p2p.push(e);
        } else {
            others.push(e);
        }
    });

    console.log(`Total P2P (User -> User): ${p2p.length} entradas, sumando ${p2p.reduce((s, e) => s + e.amount, 0)}💎`);
    console.log(`Total 'Burned' (User -> System/Null): ${burns.length} entradas, sumando ${burns.reduce((s, e) => s + e.amount, 0)}💎`);

    if (burns.length > 0) {
        console.table(burns.map(b => ({
            id: b.id,
            from: b.from_user,
            to: b.to_user,
            amount: b.amount,
            type: b.type,
            desc: b.description
        })));
    }
}
diag();
