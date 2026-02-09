import { pb } from './src/pocketbase.js';

async function checkTags() {
    try {
        const records = await pb.collection('prompts').getList(1, 5, {
            sort: '-created'
        });
        console.log("LAST 5 POSTS:");
        records.items.forEach(p => {
            console.log(`Title: ${p.title} | Tags: ${JSON.stringify(p.tags)}`);
        });
    } catch (e) {
        console.error(e);
    }
}

checkTags();
