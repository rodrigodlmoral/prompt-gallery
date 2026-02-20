
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function inspectChatFields() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('Fetching one record from global_chat...');
        const records = await pb.collection('global_chat').getList(1, 1);

        if (records.items.length > 0) {
            console.log('Record Fields:', Object.keys(records.items[0]));
            console.log('Sample Data:', JSON.stringify(records.items[0], null, 2));
        } else {
            console.log('No records found in global_chat.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

inspectChatFields();
