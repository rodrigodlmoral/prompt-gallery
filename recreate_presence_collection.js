
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function recreatePresence() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        // 1. Intentar borrar si existe
        try {
            console.log('Checking for existing "chat_presence"...');
            const collection = await pb.collections.getOne('chat_presence');
            console.log('Deleting existing collection...');
            await pb.collections.delete(collection.id);
            console.log('✅ Old collection deleted.');
        } catch (e) {
            console.log('ℹ️ No existing collection to delete.');
        }

        // 2. Crear usando fields (v0.22+)
        // NO incluimos el campo 'id' explícitamente para
        const collectionData = {
            name: 'chat_presence',
            type: 'base',
            fields: [
                {
                    name: 'user',
                    type: 'relation',
                    required: true,
                    collectionId: '_pb_users_auth_', // Correct for v0.22+ top-level
                    maxSelect: 1,
                    cascadeDelete: true
                },
                {
                    name: 'last_seen',
                    type: 'date',
                    required: true
                }
            ],
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: 'user = @request.auth.id',
            deleteRule: null
        };

        console.log('Creating chat_presence collection (v0.22 fields style)...');
        const created = await pb.collections.create(collectionData);
        console.log('✅ Collection created with ID:', created.id);
        console.log('Schema:', JSON.stringify(created.schema || created.fields, null, 2));

    } catch (err) {
        console.error('❌ Error recreating collection:', err.message);
        if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
    }
}

recreatePresence();
