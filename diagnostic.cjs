
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io');

async function check() {
    try {
        console.log("Checking connection to:", pb.baseUrl);
        const record = await pb.collection('prompts').getFirstListItem('', { expand: 'author' });
        console.log("SUCCESS! First record found:");
        console.log(JSON.stringify(record, null, 2));
    } catch (e) {
        console.error("FAILED to connect or fetch record:", e);
    }
}

check();
