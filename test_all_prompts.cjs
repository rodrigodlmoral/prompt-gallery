const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const pb = new PocketBase(PB_URL);
    // auth not strictly necessary for viewing if it is public, but let's try
    const email = 'rodridom.rock@gmail.com';
    const pass = 'alcaline01#pock';
    await pb.admins.authWithPassword(email, pass);

    try {
        console.log("Testing loadAllPromptsForAnalysis logic");
        const all = await pb.collection('prompts').getFullList({
            sort: '-created_at_custom',
            expand: 'author',
            $autoCancel: false
        });
        console.log("Success! Found " + all.length);
    } catch (e) {
        console.error("Error with -created_at_custom sort:", e.status, e.message, e.data);
    }
}
main().catch(console.error);
