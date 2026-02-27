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
        console.log("Testing getActiveBoostsByType('daily')");
        const res = await pb.collection('boosts').getFullList({
            filter: `type="daily" && is_active=true`,
            sort: '-purchased_at',
            expand: 'prompt,user',
        });
        console.log("Success! Found " + res.length);
        console.log("First item:", JSON.stringify(res[0], null, 2));
    } catch (e) {
        console.error("Error with -purchased_at sort:", e.status, e.message, e.data);
    }
}
main().catch(console.error);
