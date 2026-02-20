import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function forceCreate() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🗑️ Eliminando colección fallida...");
        try {
            await pb.collections.delete('facebook_queue');
            console.log("✅ Eliminada.");
        } catch (e) {
            console.log("ℹ️ No existía o error al borrar.");
        }

        console.log("🛠️ FORZANDO creación vía API Raw (/api/collections)...");

        // Construct the RAW payload expected by PocketBase API
        // PocketBase v0.23+ uses 'fields' array. Older uses 'schema'.
        // We will send BOTH to be safe, though usually they are mutually exclusive or mapped.
        // Actually, let's look at the "minimal" successful create. It returned an ID.
        // The issue is adding fields.

        const payload = {
            name: "facebook_queue",
            type: "base",
            system: false,
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
            listRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            viewRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            createRule: "@request.auth.id != ''",
            updateRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            deleteRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'"
        };

        // Try raw request
        try {
            const res = await pb.send('/api/collections', {
                method: 'POST',
                body: payload
            });
            console.log("✅ Respuesta RAW:", JSON.stringify(res, null, 2));

        } catch (err) {
            console.error("❌ Error API Raw:", err.data || err.message);

            // Fallback: Try with 'fields' instead of 'schema' if version is new
            console.log("🔄 Intentando Fallback (usando key 'fields')...");
            const payloadV2 = { ...payload, fields: payload.schema };
            delete payloadV2.schema;

            try {
                const res2 = await pb.send('/api/collections', {
                    method: 'POST',
                    body: payloadV2
                });
                console.log("✅ Respuesta RAW (Fallback):", JSON.stringify(res2, null, 2));
            } catch (err2) {
                console.error("❌ Error Fallback:", err2.data || err2.message);
            }
        }

    } catch (err) {
        console.error("❌ Error General:", err);
    }
}

forceCreate();
