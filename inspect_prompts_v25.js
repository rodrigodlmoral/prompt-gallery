import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function inspectPrompts() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🔍 Inspeccionando colección 'prompts'...");
        const collection = await pb.collections.getOne('prompts');

        console.log("✅ Estructura detectada:");
        // Use JSON.stringify with a replacer or just log specific keys to avoid truncation
        // But I want to see the 'fields' array format
        console.log("--- START FIELDS ---");
        console.log(JSON.stringify(collection.fields, null, 2));
        console.log("--- END FIELDS ---");

    } catch (err) {
        console.error("❌ Error:", err.data || err.message);
    }
}

inspectPrompts();
