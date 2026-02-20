
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function fixChatSchema() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) throw new Error('Admin credentials missing');

        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log('Fetching collection "global_chat"...');
        const collection = await pb.collections.getOne('global_chat');

        // Define fields to add
        const expectedFields = [
            {
                name: 'user',
                type: 'relation',
                required: true,
                options: {
                    collectionId: 'users',
                    cascadeDelete: false,
                    maxSelect: 1,
                    displayFields: ['username']
                }
            },
            {
                name: 'message',
                type: 'text',
                required: true,
                options: { min: 1, max: 500 }
            },
            {
                name: 'type',
                type: 'select',
                required: true,
                options: {
                    values: ['TEXT', 'PROMPT_SHARE', 'TIP_ALERT', 'SYSTEM']
                }
            },
            {
                name: 'metadata',
                type: 'json',
                required: false
            }
        ];

        // Check which fields are missing
        const existingNames = collection.schema.map(f => f.name);
        let updated = false;

        expectedFields.forEach(field => {
            if (!existingNames.includes(field.name)) {
                console.log(`Adding missing field: ${field.name}`);
                collection.schema.push(field);
                updated = true;
            }
        });

        if (updated) {
            console.log('Updating collection schema...');
            await pb.collections.update(collection.id, collection);
            console.log('✅ Collection updated successfully!');
        } else {
            console.log('ℹ️ Collection schema is already complete.');
            console.log('Current schema fields:', existingNames);
        }

    } catch (err) {
        console.error('❌ Error fixing collection:', err.message);
        if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
    }
}

fixChatSchema();
