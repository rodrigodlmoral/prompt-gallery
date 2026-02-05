import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkSchema() {
    try {
        console.log("Checking public prompts...");
        const prompts = await pb.collection('prompts').getList(1, 1);
        if (prompts.items.length > 0) {
            console.log("Prompt sample:", JSON.stringify(prompts.items[0], null, 2));
        } else {
            console.log("No prompts found.");
        }

        console.log("\nChecking collections (might fail without admin):");
        const collections = await pb.collections.getList(1, 100);
        console.log("Collections:", collections.items.map(c => c.name));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkSchema();
