
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io');

async function testSort() {
    try {
        console.log("Testing sort: -created");
        const res1 = await pb.collection('prompts').getList(1, 1, { sort: '-created' });
        console.log("SUCCESS -created:", res1.items[0]?.title);

        console.log("Testing sort: created");
        const res2 = await pb.collection('prompts').getList(1, 1, { sort: 'created' });
        console.log("SUCCESS created:", res2.items[0]?.title);
    } catch (e) {
        console.error("SORT TEST FAILED:", e.message);
    }
}

testSort();
