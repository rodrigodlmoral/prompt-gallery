import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodrigodlmoral@gmail.com';
const adminPass = 'Rodridom2525';

async function createQueueCollection() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🛠️ Intentando crear colección 'facebook_queue'...");

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
            });
            console.log("✅ Colección 'facebook_queue' creada con éxito.");
        } catch (e) {
            console.warn("⚠️ Error creando (probablemente ya existe):", e.data?.message || e.message);
        }

    } catch (err) {
        console.error("❌ Error CRÍTICO de Autenticación:", err.status, err.message);
    }
}

createQueueCollection();
