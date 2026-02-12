const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const EMAIL = 'rodridom.rock@gmail.com';
const PASS = 'alcaline01#pock';

async function checkPromptsSchema() {
    try {
        await pb.admins.authWithPassword(EMAIL, PASS);
        const collection = await pb.collections.getOne('prompts');
        const fields = collection.schema || collection.fields || [];

        const authorField = fields.find(f => f.name === 'author');
        console.log("AUTHOR_FIELD_JSON:", JSON.stringify(authorField, null, 2));

    } catch (e) {
        console.error("SCHEMA_ERROR:", e.message);
    }
}

checkPromptsSchema();
