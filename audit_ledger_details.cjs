const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function run() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);

    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    } catch (e) {
        await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    }

    const BANK_USER_ID = 'z44ierjl0thcczd';
    const RODRIGO_ID = 'rkmrhmgh067x7un';

    console.log("--- AUDITORÍA DE LEDGER PARA CLASIFICACIÓN ---");

    const entries = await pb.collection('ledger').getFullList({
        filter: 'type = "TIP" || type = "PURCHASE" || description ~ "AJUSTE CONTABLE"',
        fields: 'id,amount,type,from_user,to_user,description,entry_type'
    });

    console.log(`Total entradas encontradas: ${entries.length}`);

    const result = {
        tips: [],
        migration: [],
        audit: []
    };

    entries.forEach(e => {
        const isTip = e.type === 'TIP';
        const isAudit = e.description.includes('AJUSTE CONTABLE');
        const isPurchase = e.type === 'PURCHASE';

        const row = { id: e.id, amount: e.amount, from: e.from_user, to: e.to_user, desc: e.description, entry: e.entry_type };

        if (isTip) result.tips.push(row);
        else if (isAudit) result.audit.push(row);
        else if (isPurchase) result.migration.push(row);
    });

    console.log("\n--- PROPINAS ---");
    result.tips.forEach(t => console.log(`[TIP] From: ${t.from} To: ${t.to} Amount: ${t.amount} Desc: ${t.desc}`));

    console.log("\n--- MIGRACIÓN (PURCHASE SIN AJUSTE) ---");
    result.migration.slice(0, 10).forEach(m => console.log(`[MIGRACION] From: ${m.from} To: ${m.to} Amount: ${m.amount} Entry: ${m.entry}`));

    console.log("\n--- AJUSTES AUDITORÍA ---");
    result.audit.slice(0, 10).forEach(a => console.log(`[AUDIT] From: ${a.from} To: ${a.to} Amount: ${a.amount} Desc: ${a.desc}`));
}

run();
