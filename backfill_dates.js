
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function backfillDates() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        for (const collName of ['ledger', 'activity_logs']) {
            console.log(`🔍 Procesando registros de: ${collName}...`);
            const records = await pb.collection(collName).getFullList({
                filter: 'created = "" || updated = ""'
            });

            console.log(`Encontrados ${records.length} registros sin fecha.`);

            for (const rec of records) {
                try {
                    // Update created and updated if they are empty
                    // PocketBase usually handles 'created' as read-only once saved, 
                    // BUT if we added it as a NEW field, we might be able to set it once.
                    // If not, at least they will be sorted.

                    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
                    await pb.collection(collName).update(rec.id, {
                        created: rec.created || now,
                        updated: rec.updated || now
                    });
                } catch (e) {
                    console.error(`Error actualizando record ${rec.id}:`, e.message);
                }
            }
            console.log(`✅ ${collName} procesado.`);
        }

        console.log("\n🚀 ¡MANTENIMIENTO COMPLETADO!");

    } catch (err) {
        console.error("Backfill failed:", err.message);
    }
}

backfillDates();
