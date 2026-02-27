const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    const userId = 'rkmrhmgh067x7un';

    try {
        console.log("Querying prompts for", userId);
        const prompts = await pb.collection('prompts').getFullList({
            filter: `author="${userId}"`,
            sort: '-updated'
        });
        console.log(`Found ${prompts.length} prompts.`);
        console.log(prompts);
    } catch (e) {
        console.error("Error from PB:");
        console.error(e.message);
        console.error(JSON.stringify(e.data, null, 2));
    }
}

main().catch(console.error);
