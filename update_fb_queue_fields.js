import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function updateFields() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🛠️ Actualizando campos de 'facebook_queue'...");
        const collection = await pb.collections.getOne('facebook_queue');

        // Prepare schema (adding to existing)
        const newFields = [

            // 1. Prompt Relation
            {
                name: 'prompt',
                type: 'relation',
                required: true,
                options: {
                    collectionId: 'prompts',
                    cascadeDelete: false,
                    minSelect: 1,
                    maxSelect: 1,
                    displayFields: ['title', 'id']
                }
            },

            // 2. Status Select
            {
                name: 'status',
                type: 'select',
                required: true,
                options: {
                    maxSelect: 1,
                    values: ['pending', 'processing', 'published', 'failed']
                }
            },

            // 3. User Relation
            {
                name: 'added_by',
                type: 'relation',
                required: false,
                options: {
                    collectionId: 'users',
                    cascadeDelete: false,
                    minSelect: null,
                    maxSelect: 1,
                    displayFields: ['username']
                }
            },

            // 4. Error Log
            {
                name: 'error_log',
                type: 'text',
                required: false
            },

            // 5. Scheduled For
            {
                name: 'scheduled_for',
                type: 'date',
                required: false
            }
        ];

        // Merge old dummy field with new ones? Or replace? 
        // PocketBase update replaces the schema with what we send, but preserves existing data if compatible.
        // We'll replace the dummy_field completely.

        // IMPORTANT: Check if we need to use 'schema' or 'fields' api.
        // Based on previous failure with 'fields' in create, and success with 'schema' in minimal create...
        // We stick to 'schema' property for now as key.

        collection.schema = newFields;

        // Also fix rules while we are at it
        collection.listRule = "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'";
        collection.viewRule = "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'";
        collection.createRule = "@request.auth.id != ''";
        collection.updateRule = "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'";
        collection.deleteRule = "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'";

        await pb.collections.update('facebook_queue', collection);
        console.log("✅ Campos de 'facebook_queue' actualizados con éxito.");

    } catch (err) {
        console.error("❌ Error actualizando campos:", err.data || err.message);
    }
}

updateFields();
