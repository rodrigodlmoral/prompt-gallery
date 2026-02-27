const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
    const pass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    try {
        const promptsColl = await pb.collections.getOne('prompts');
        console.log("Prompts collection schema/rules:");
        console.log("listRule:", promptsColl.listRule);
        console.log("viewRule:", promptsColl.viewRule);
        console.log("indexes:", promptsColl.indexes);
        console.log("system schema options:", promptsColl.schema);
    } catch (e) {
        console.error("Error from PB:", e.message);
    }
}

main().catch(console.error);
