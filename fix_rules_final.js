
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function fixPresenceAndUsers() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        // 1. Fix 'users' rules
        console.log('Updating "users" rules...');
        const usersCol = await pb.collections.getOne('users');
        await pb.collections.update(usersCol.id, {
            ...usersCol,
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""'
        });
        console.log('✅ "users" rules updated.');

        // 2. Fix 'chat_presence' rules and ensure unique index
        console.log('Updating "chat_presence" rules and index...');
        const presenceCol = await pb.collections.getOne('chat_presence');
        await pb.collections.update(presenceCol.id, {
            ...presenceCol,
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: 'user = @request.auth.id',
            indexes: [
                'CREATE UNIQUE INDEX idx_unique_user_presence ON chat_presence (user)'
            ]
        });
        console.log('✅ "chat_presence" updated with unique index.');

    } catch (err) {
        console.error('❌ Error fixing rules:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

fixPresenceAndUsers();
