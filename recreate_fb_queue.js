import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function recreateQueue() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🗑️ Eliminando colección malformada 'facebook_queue'...");
        try {
            await pb.collections.delete('facebook_queue');
            console.log("✅ Colección eliminada.");
        } catch (e) {
            console.warn("⚠️ No se pudo eliminar (quizás no existía):", e.message);
        }

        console.log("🛠️ Re-creando colección 'facebook_queue'...");

        // Use 'schema' property (standard for JS SDK create)
        // But make sure structure is perfect.

        try {
            await pb.collections.create({
                name: 'facebook_queue',
                type: 'base',
                schema: [
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
                    {
                        name: 'status',
                        type: 'select',
                        required: true,
                        options: {
                            maxSelect: 1,
                            values: ['pending', 'processing', 'published', 'failed']
                        }
                    },
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
                    {
                        name: 'error_log',
                        type: 'text',
                        required: false
                    },
                    {
                        name: 'scheduled_for',
                        type: 'date',
                        required: false
                    }
                ],
                // Set Permissions IMMEDIATELY
                listRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                viewRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                createRule: "@request.auth.id != ''", // Allow Authenticated Users
                updateRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                deleteRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'"
            });
            console.log("✅ Colección 'facebook_queue' RE-CREADA con éxito.");
        } catch (e) {
            console.error("❌ Error creando colección:", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Error General:", err);
    }
}

recreateQueue();
