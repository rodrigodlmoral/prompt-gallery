import PocketBase from 'pocketbase';
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function audit() {
    try {
        const records = await pb.collection('prompts').getList(1, 100);
        console.log(`Total Prompts: ${records.totalItems}`);
        console.log(`Items on Page 1: ${records.items.length}`);
        if (records.items.length > 0) {
            console.log(`First Item Title: ${records.items[0].title}`);
        }
    } catch (e) {
        console.error("Audit failed:", e);
    }
}

audit();
