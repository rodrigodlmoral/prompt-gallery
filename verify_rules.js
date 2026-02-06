import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function verifyRules() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        const collections = await pb.collections.getFullList();
        const promptsCollection = collections.find(c => c.name === 'prompts');

        console.log("=== REGLAS ACTUALES ===\n");
        console.log(`List Rule: ${promptsCollection.listRule || '(vacío)'}`);
        console.log(`View Rule: ${promptsCollection.viewRule || '(vacío)'}`);
        console.log(`Create Rule: ${promptsCollection.createRule || '(vacío)'}`);
        console.log(`Update Rule: ${promptsCollection.updateRule || '(vacío)'}`);
        console.log(`Delete Rule: ${promptsCollection.deleteRule || '(vacío)'}`);

        console.log("\n=== CAMPOS DE LA COLECCIÓN ===");
        promptsCollection.schema.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

verifyRules();
