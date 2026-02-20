
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function debugChat() {
    try {
        console.log("Fetching last 10 chat messages...");
        const records = await pb.collection('global_chat').getList(1, 10, {
            sort: '-created',
            requestKey: null
        });

        console.log(`Total found: ${records.totalItems}`);
        records.items.forEach(r => {
            console.log(`[${r.type}] ${r.message}`);
            // Check metadata
            if (r.metadata) {
                console.log("   Metadata:", JSON.stringify(r.metadata));
            } else {
                console.log("   No Metadata");
            }
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

debugChat();
