
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io');

async function auditFields() {
    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
        const collection = await pb.collections.getOne('prompts');
        console.log("FIELDS:", collection.schema.map(f => f.name).join(', '));
    } catch (e) {
        console.error("AUDIT FAILED:", e.message);
        // Fallback: just check first record keys
        const record = await pb.collection('prompts').getFirstListItem('');
        console.log("KEYS:", Object.keys(record).join(', '));
    }
}

auditFields();
