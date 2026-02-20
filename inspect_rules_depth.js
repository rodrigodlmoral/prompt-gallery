import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function inspectRules() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🔍 Inspeccionando 'facebook_queue'...");
        const c = await pb.collections.getOne('facebook_queue');

        console.log("🛡️ REGLAS ACTUALES:");
        console.log("   List:", JSON.stringify(c.listRule));
        console.log("   View:", JSON.stringify(c.viewRule));
        console.log("   Create:", JSON.stringify(c.createRule));

        console.log("📜 CAMPOS RELACIÓN:");
        const promptField = c.fields.find(f => f.name === 'prompt');
        const addedByField = c.fields.find(f => f.name === 'added_by');

        console.log("   Prompt Field:", JSON.stringify(promptField, null, 2));
        console.log("   AddedBy Field:", JSON.stringify(addedByField, null, 2));

    } catch (err) {
        console.error("❌ Error:", err.data || err.message);
    }
}

inspectRules();
