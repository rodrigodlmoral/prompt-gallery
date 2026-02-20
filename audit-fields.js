import PocketBase from 'pocketbase';
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function audit() {
    try {
        console.log("Fetching first record to check fields...");
        const result = await pb.collection('prompts').getList(1, 1);
        if (result.items[0]) {
            console.log("Fields found:", Object.keys(result.items[0]));
            console.log("Values for sorting fields:");
            console.log("created_at_custom:", result.items[0].created_at_custom);
            console.log("created:", result.items[0].created);
            console.log("id:", result.items[0].id);
        } else {
            console.log("No records found in prompts collection.");
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

audit();
