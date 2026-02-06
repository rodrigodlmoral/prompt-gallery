import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkData() {
    try {
        console.log("--- Checking Prompts ---");
        const list = await pb.collection('prompts').getList(1, 5, {
            expand: 'author'
        });

        list.items.forEach(p => {
            console.log(`Prompt ID: ${p.id}`);
            console.log(`Author Field: ${p.author}`);
            console.log(`Author Name (Expand): ${p.expand?.author?.username || p.expand?.author?.name}`);
            console.log(`Copy Count: ${p.copy_count}`);
            console.log("--------------------");
        });

        console.log("\n--- Checking Rodrigo User ---");
        const user = await pb.collection('users').getFirstListItem('username="rodrigodlmoral"');
        console.log(`User ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Prompts Count (Stored): ${user.prompts_count}`);

        const actualCount = await pb.collection('prompts').getList(1, 1, {
            filter: `author = "${user.id}"`
        });
        console.log(`Actual Count from DB: ${actualCount.totalItems}`);

    } catch (err) {
        console.error("Error:", err);
    }
}

checkData();
