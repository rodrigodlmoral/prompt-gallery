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

    console.log("--- BUSCANDO 'QUEMADOS' (User -> System) ---");
    const ledger = await pb.collection('ledger').getFullList({
        sort: '-created'
    });

    let burnedTotal = 0;
    const burnedEntries = [];

    ledger.forEach(entry => {
        const amount = entry.amount || 0;
        const fromSystem = SYSTEM_IDS.includes(entry.from_user) || !entry.from_user;
        const toSystem = SYSTEM_IDS.includes(entry.to_user);
        const hasEntryType = !!entry.entry_type;

        let isBurned = false;
        let reason = "";

        if (hasEntryType) {
            if (!fromSystem && toSystem && entry.entry_type === 'DEBIT') {
                isBurned = true;
                reason = "Modern DEBIT to System";
            }
        } else {
            // Legacy check
            if (!fromSystem && (toSystem || ['PURCHASE', 'BOOST', 'FEE'].includes(entry.type))) {
                isBurned = true;
                reason = `Legacy ${entry.type || 'UNKNOWN'} to System/Null`;
            }
        }

        if (isBurned) {
            burnedTotal += amount;
            burnedEntries.push({
                id: entry.id,
                from: entry.from_user,
                to: entry.to_user,
                amount: entry.amount,
                type: entry.type,
                reason,
                created: entry.created
            });
        }
    });

    console.log(`Total Quemado detectado: ${burnedTotal}`);
    console.log("Ejemplos de entradas 'quemadas':");
    console.table(burnedEntries.slice(0, 20));

    console.log("\n--- BUSCANDO EMISIONES (System -> User) ---");
    let mintedTotal = 0;
    const mintedByType = {};

    ledger.forEach(entry => {
        const amount = entry.amount || 0;
        const fromSystem = SYSTEM_IDS.includes(entry.from_user) || !entry.from_user;
        const toSystem = SYSTEM_IDS.includes(entry.to_user);
        const hasEntryType = !!entry.entry_type;

        let isMinted = false;
        if (hasEntryType) {
            if (fromSystem && !toSystem && entry.entry_type === 'CREDIT') isMinted = true;
        } else {
            if (fromSystem && !toSystem) isMinted = true;
        }

        if (isMinted) {
            mintedTotal += amount;
            const t = (entry.type === 'PURCHASE' && !hasEntryType) ? 'MIGRACION' : (entry.type || 'UNKNOWN');
            mintedByType[t] = (mintedByType[t] || 0) + amount;
        }
    });

    console.log(`Total Emitido detectado: ${mintedTotal}`);
    console.log("Desglose por tipo:");
    console.table(mintedByType);
}

diag();
