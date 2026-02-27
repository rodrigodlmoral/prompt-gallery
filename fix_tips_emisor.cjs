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

    // Rodrigo's ID found from audit: rkmrhmgh067x7un (Legacy Admin ID)
    const RODRIGO_ID = 'rkmrhmgh067x7un';
    console.log(`RODRIGO_ID: ${RODRIGO_ID}`);

    const BANK_USER_ID = 'z44ierjl0thcczd';
    const SYSTEM_IDS = [BANK_USER_ID, RODRIGO_ID, null, ''];

    const tips = await pb.collection('ledger').getFullList({
        filter: 'type = "TIP"'
    });

    let count = 0;
    for (const tip of tips) {
        const hasNoEmisor = !tip.from_user || SYSTEM_IDS.includes(tip.from_user);

        if (hasNoEmisor) {
            console.log(`Arreglando Propina ${tip.id}: ${tip.amount}💎 para @${tip.to_user}`);
            await pb.collection('ledger').update(tip.id, {
                from_user: RODRIGO_ID,
                description: tip.description + " (Emisor legacy corregido a @rodrigodlmoral)"
            });
            count++;
        }
    }

    console.log(`--- PROCESO FINALIZADO: ${count} propinas corregidas ---`);
}

run();
