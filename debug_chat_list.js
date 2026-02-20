
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function debugChatList() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('--- ATTEMPT 1: Standard List with Expand ---');
        try {
            const records = await pb.collection('global_chat').getList(1, 10, {
                sort: '-created',
                expand: 'user'
            });
            console.log('✅ Success! Found:', records.items.length);
        } catch (e) {
            console.error('❌ Failed Attempt 1:', e.message);
            if (e.data) console.error(JSON.stringify(e.data, null, 2));
        }

        console.log('\n--- ATTEMPT 2: Simple List (No Expand) ---');
        try {
            const records = await pb.collection('global_chat').getList(1, 10, {
                sort: '-created'
            });
            console.log('✅ Success! Found:', records.items.length);
        } catch (e) {
            console.error('❌ Failed Attempt 2:', e.message);
        }

        console.log('\n--- ATTEMPT 3: Raw List (No Sort, No Expand) ---');
        try {
            const records = await pb.collection('global_chat').getList(1, 10);
            console.log('✅ Success! Found:', records.items.length);
        } catch (e) {
            console.error('❌ Failed Attempt 3:', e.message);
        }

    } catch (err) {
        console.error('❌ Global Error:', err.message);
    }
}

debugChatList();
