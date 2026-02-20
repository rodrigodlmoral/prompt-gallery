const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function auditCount() {
    try {
        console.log("🔍 Auditing Prompt Collection...");
        const result = await pb.collection('prompts').getList(1, 1, {
            $autoCancel: false
        });
        console.log(`📊 TOTAL RECORDS IN DB (via count): ${result.totalItems}`);

        const lastBatch = await pb.collection('prompts').getList(6, 60, {
            sort: '-created_at_custom',
            $autoCancel: false
        });
        console.log(`📑 Batch 6 (sort: -created_at_custom) returned: ${lastBatch.items.length} items`);

        const lastBatchFallback = await pb.collection('prompts').getList(6, 60, {
            sort: '-id',
            $autoCancel: false
        });
        console.log(`📑 Batch 6 (sort: -id) returned: ${lastBatchFallback.items.length} items`);

        // Check if many items have null created_at_custom
        const missingCustom = await pb.collection('prompts').getList(1, 1, {
            filter: 'created_at_custom = "" || created_at_custom = null',
            $autoCancel: false
        });
        console.log(`❓ Records with MISSING created_at_custom: ${missingCustom.totalItems}`);

    } catch (err) {
        console.error("❌ Audit failed:", err);
    }
}

auditCount();
