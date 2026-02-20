
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function auditRules() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const collections = ['users', 'chat_presence', 'global_chat'];

        for (const name of collections) {
            const c = await pb.collections.getOne(name);
            console.log(`\n📦 Collection: ${c.name}`);
            console.log(`   List:   ${c.listRule}`);
            console.log(`   View:   ${c.viewRule}`);
            console.log(`   Create: ${c.createRule}`);
            console.log(`   Update: ${c.updateRule}`);
        }

    } catch (err) {
        console.error('❌ Error auditing rules:', err.message);
    }
}

auditRules();
