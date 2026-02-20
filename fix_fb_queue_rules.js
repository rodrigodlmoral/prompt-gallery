import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function fixQueueRules() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🛠️ Actualizando reglas de 'facebook_queue'...");

        const collection = await pb.collections.getOne('facebook_queue');

        // ALLOW LOGIC:
        // Create: Authed users (para que funcione el Auto-Add de cualquier usuario)
        // List/View: Admins only (o usuarios especificos)
        // Update/Delete: Admins only

        const adminFilter = "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'";

        collection.listRule = adminFilter;
        collection.viewRule = adminFilter;
        collection.createRule = "@request.auth.id != ''"; // Cualquier usuario logueado puede 'sugerir/encolar'
        collection.updateRule = adminFilter;
        collection.deleteRule = adminFilter;

        await pb.collections.update('facebook_queue', collection);

        console.log("✅ Reglas actualizadas correctamente.");
        console.log("   Create: Authenticated Users");
        console.log("   Others: Admins Only");

    } catch (err) {
        console.error("❌ Error actualizando reglas:", err.data || err.message);
    }
}

fixQueueRules();
