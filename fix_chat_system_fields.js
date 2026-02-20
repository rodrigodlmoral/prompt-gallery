
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function fixChatSchema() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('Fetching "global_chat" collection...');
        const collection = await pb.collections.getOne('global_chat');

        // Añadir campos de sistema si faltan
        const hasCreated = collection.fields.some(f => f.name === 'created');
        const hasUpdated = collection.fields.some(f => f.name === 'updated');

        if (!hasCreated || !hasUpdated) {
            console.log('Adding missing system fields (created, updated)...');

            if (!hasCreated) {
                collection.fields.push({
                    name: 'created',
                    type: 'autodate',
                    required: true,
                    onCreate: true, // v0.22+ requirement
                    onUpdate: false
                });
            }
            if (!hasUpdated) {
                collection.fields.push({
                    name: 'updated',
                    type: 'autodate',
                    required: true,
                    onCreate: true,
                    onUpdate: true
                });
            }

            await pb.collections.update(collection.id, collection);
            console.log('✅ Collection updated with system fields.');
        } else {
            console.log('ℹ️ System fields already present.');
        }

    } catch (err) {
        console.error('❌ Error fixing schema:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
    }
}

fixChatSchema();
