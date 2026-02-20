import PocketBase from 'pocketbase';
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function audit() {
    try {
        console.log("Checking collection schema...");
        const collection = await pb.collections.getOne('prompts');
        // console.log("Schema:", JSON.stringify(collection.schema, null, 2));

        console.log("\nChecking first record raw fields:");
        const record = await pb.collection('prompts').getList(1, 1);
        if (record.items[0]) {
            console.log("Fields:", Object.keys(record.items[0]));
            if (record.items[0].created_at_custom) {
                console.log("Sample created_at_custom:", record.items[0].created_at_custom);
            }
        }
    } catch (e) {
        console.error("Audit failed:", e);
    }
}

audit();
