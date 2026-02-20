import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function fixFinal() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🗑️ Eliminando colección anterior...");
        await pb.collections.delete('facebook_queue').catch(() => { });

        console.log("🛠️ Re-creando (v0.25 Final - con IDs Internos)...");

        const payload = {
            name: "facebook_queue",
            type: "base",
            fields: [
                // 1. Prompt Relation (Using Internal ID)
                {
                    name: "prompt",
                    type: "relation",
                    collectionId: "pbc_2721965843", // Prompts internal ID
                    maxSelect: 1,
                    minSelect: 0,
                    cascadeDelete: false,
                    required: true
                },
                // 2. Status Select
                {
                    name: "status",
                    type: "select",
                    values: ["pending", "processing", "published", "failed"],
                    maxSelect: 1,
                    required: true
                },
                // 3. Added By User (Using Auth Collection ID)
                {
                    name: "added_by",
                    type: "relation",
                    collectionId: "_pb_users_auth_",
                    maxSelect: 1,
                    minSelect: 0,
                    cascadeDelete: false,
                    required: false
                },
                // 4. Error Log
                {
                    name: "error_log",
                    type: "text",
                    required: false
                },
                // 5. Scheduled For
                {
                    name: "scheduled_for",
                    type: "date",
                    required: false
                }
            ],
            listRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            viewRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            createRule: "@request.auth.id != ''",
            updateRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'",
            deleteRule: "@request.auth.role = 'admin' || @request.auth.username = 'rodrigodlmoral' || @request.auth.username = 'rodridomrock'"
        };

        const res = await pb.collections.create(payload);
        console.log("✅ ¡COLECCIÓN CREADA EXITOSAMENTE!");
        console.log("ID:", res.id);
        console.log("Campos confirmados:", res.fields.map(f => f.name).join(", "));

    } catch (err) {
        console.error("❌ Error CRÍTICO:", JSON.stringify(err.data || err.message, null, 2));
    }
}

fixFinal();
