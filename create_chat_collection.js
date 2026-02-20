
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function createChatCollection() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        if (!adminEmail || !adminPass) {
            throw new Error('Admin credentials missing in .env');
        }

        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const collectionData = {
            name: 'global_chat',
            type: 'base',
            schema: [
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
                    options: {
                        min: 1,
                        max: 500
                    }
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
            ],
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: null,
            deleteRule: null,
            options: {}
        };

        console.log('Creating global_chat collection...');
        await pb.collections.create(collectionData);
        console.log('✅ Collection created successfully!');

    } catch (err) {
        if (err.status === 400 && err.data?.name?.code === 'validation_not_unique') {
            console.log('ℹ️ Collection "global_chat" already exists.');
        } else {
            console.error('❌ Error creating collection:', err.message);
            if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
        }
    }
}

createChatCollection();
