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
        const authorField = promptsColl.fields.find(f => f.name === 'author');
        console.log("Author relation options:", JSON.stringify(authorField, null, 2));
    } catch (e) {
        console.error("Error from PB:", e.message);
    }
}
main().catch(console.error);
