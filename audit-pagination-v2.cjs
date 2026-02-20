const PocketBase = require('./node_modules/pocketbase/cjs/index.js');
const pb = new PocketBase('http://127.0.0.1:8090');

async function audit() {
    try {
        console.log("Checking total count...");
        const res = await pb.collection('prompts').getList(1, 1);
        console.log("TOTAL_ITEMS_IN_DB:", res.totalItems);

        const res2 = await pb.collection('prompts').getList(1, 10, {
            sort: '-created_at_custom'
        });
        console.log("FIRST_10_WITH_SORT:", res2.items.map(i => ({ id: i.id, custom: i.created_at_custom })));

    } catch (e) {
        console.error("FAIL:", e.message);
    }
}
audit();
