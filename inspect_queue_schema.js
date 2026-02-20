import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function inspectSchema() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🔍 Inspeccionando colección 'facebook_queue'...");
        try {
            const collection = await pb.collections.getOne('facebook_queue');
            if (collection.fields) {
                console.log("FIELD NAMES:", collection.fields.map(f => f.name));
            } else {
                console.log("⚠️ NO FIELDS PROPERTY FOUND!");
            }
            console.log("🛡️ Reglas:");
            console.log("   List:", collection.listRule);
            console.log("   View:", collection.viewRule);
            console.log("   Create:", collection.createRule);
            console.log("   Update:", collection.updateRule);
            console.log("   Delete:", collection.deleteRule);
        } catch (e) {
            console.error("❌ Error obteniendo colección:", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Error de Autenticación:", err.message);
    }
}

inspectSchema();
