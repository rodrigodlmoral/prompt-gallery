import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function recreateQueue() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🗑️ Eliminando colección vacía 'facebook_queue'...");
        try {
            await pb.collections.delete('facebook_queue');
            console.log("✅ Colección eliminada.");
        } catch (e) {
            console.warn("⚠️ No se pudo eliminar:", e.message);
        }

        console.log("🛠️ Re-creando colección 'facebook_queue' (Intento v3 - usando 'fields')...");

        try {
            await pb.collections.create({
                name: 'facebook_queue',
                type: 'base',
                fields: [
                    {
                        name: 'prompt',
                        type: 'relation',
                        required: true,
                        presentable: false,
                        unique: false,
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
                        presentable: false,
                        unique: false,
                        options: {
                            maxSelect: 1,
                            values: ['pending', 'processing', 'published', 'failed']
                        }
                    },
                    {
                        name: 'added_by',
                        type: 'relation',
                        required: false,
                        presentable: false,
                        unique: false,
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
                        required: false,
                        presentable: false,
                        unique: false,
                        options: {
                            min: null,
                            max: null,
                            pattern: ""
                        }
                    },
                    {
                        name: 'scheduled_for',
                        type: 'date',
                        required: false,
                        presentable: false,
                        unique: false,
                        options: {
                            min: "",
                            max: ""
                        }
                    }
                ],
                listRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                viewRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                createRule: "@request.auth.id != ''", // Allow Authenticated Users
                updateRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
                deleteRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'"
            });
            console.log("✅ Colección 'facebook_queue' RE-CREADA (v3).");
        } catch (e) {
            console.error("❌ Error creando colección:", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Error General:", err);
    }
}

recreateQueue();
