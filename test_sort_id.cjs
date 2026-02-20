
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io');

async function testSortId() {
    try {
        console.log("Testing sort: -id");
        const res = await pb.collection('prompts').getList(1, 1, { sort: '-id' });
        console.log("SUCCESS -id:", res.items[0]?.title);
    } catch (e) {
        console.error("SORT TEST FAILED:", e.message);
    }
}

testSortId();
