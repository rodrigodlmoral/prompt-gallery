
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkMetadata() {
    try {
        const records = await pb.collection('global_chat').getList(1, 5, {
            sort: '-created',
            filter: 'type="PROMPT_SHARE"'
        });

        console.log("--- LAST 5 SHARED PROMPTS ---");
        records.items.forEach(r => {
            console.log(`ID: ${r.id} | Msg: ${r.message}`);
            console.log("Metadata:", JSON.stringify(r.metadata, null, 2));
            console.log("--------------------------------");
        });

    } catch (e) {
        console.error(e);
    }
}

checkMetadata();
