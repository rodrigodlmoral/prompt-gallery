import PocketBase from 'pocketbase';
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function audit() {
    try {
        console.log("Testing sort by -created_at_custom...");
        const records = await pb.collection('prompts').getList(1, 10, {
            sort: '-created_at_custom,-created',
            expand: 'author'
        });
        console.log(`Success! Total Items: ${records.totalItems}`);
        console.log(`First Item Title: ${records.items[0]?.title}`);
        console.log(`First Item Custom Created: ${records.items[0]?.created_at_custom}`);
    } catch (e) {
        console.error("Sort test failed!");
        console.error("Error Status:", e.status);
        console.error("Error Original Error:", e.originalError);
        console.error("Error Data:", JSON.stringify(e.data));
    }
}

audit();
