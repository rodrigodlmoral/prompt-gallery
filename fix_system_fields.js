
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function fixSystemFields() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        for (const collName of ['ledger', 'activity_logs']) {
            console.log(`📋 Inspeccionando colección: ${collName}...`);
            const coll = await pb.collections.getOne(collName);

            let changed = false;

            // En v0.22 (pbc_ prefix indicates newer schema), 
            // 'created' and 'updated' fields might be missing if not explicitly added 
            // or if autodate was toggled off.

            const hasCreated = coll.fields.find(f => f.name === 'created');
            if (!hasCreated) {
                console.log(`🏗️ Añadiendo campo 'created' a '${collName}'...`);
                coll.fields.push({
                    name: 'created',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: false
                });
                changed = true;
            }

            const hasUpdated = coll.fields.find(f => f.name === 'updated');
            if (!hasUpdated) {
                console.log(`🏗️ Añadiendo campo 'updated' a '${collName}'...`);
                coll.fields.push({
                    name: 'updated',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: true
                });
                changed = true;
            }

            if (changed) {
                await pb.collections.update(coll.id, coll);
                console.log(`✅ Colección '${collName}' actualizada.`);
            } else {
                console.log(`ℹ️ '${collName}' ya tiene los campos básicos.`);
            }
        }

        console.log("\n🚀 ¡SISTEMA REPARADO!");

    } catch (err) {
        console.error("Fix failed:", err.message);
        if (err.data) console.error("Error data:", JSON.stringify(err.data, null, 2));
    }
}

fixSystemFields();
