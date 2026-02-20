import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

// AUTH (Admin required)
const adminEmail = 'rodrigodlmoral@gmail.com';
const adminPass = 'Rodridom2525'; // Asumida de sesión anterior o requerir input

async function createQueueCollection() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🛠️ Creando colección 'facebook_queue'...");

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
                            collectionId: 'prompts', // ID o Nombre de la colección prompts
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
                        name: 'scheduled_for', // Opcional, para ordenamiento futuro
                        type: 'date',
                        required: false
                    }
                ],
                listRule: "", // Public legible (admin only en UI, pero dejamos abierto para debug)
                viewRule: "",
                createRule: "", // Admin o server
                updateRule: "",
                deleteRule: ""
            });
            console.log("✅ Colección 'facebook_queue' creada con éxito.");
        } catch (e) {
            console.warn("⚠️ Error creando (quizás ya existe):", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Error General:", err);
    }
}

createQueueCollection();
