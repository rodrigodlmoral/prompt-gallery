import fs from 'fs';
const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function updatePromptsFields() {
    console.log('📡 Actualizando campos de PROMPTS...');

    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();
    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    };

    const schema = JSON.parse(fs.readFileSync('./pb_schema.json', 'utf8'));
    const promptsSchema = schema.find(c => c.name === 'prompts');

    const collectionsRes = await fetch(`${PB_URL}/api/collections`, { headers });
    const collections = await collectionsRes.json();
    const serverPrompts = collections.items.find(c => c.name === 'prompts');

    if (serverPrompts && promptsSchema) {
        console.log(`Procediendo con PATCH a ${serverPrompts.id}`);
        // Combinar campos de sistema del servidor con los campos del esquema
        // PocketBase v0.22+ maneja los campos de forma diferente, pero intentaremos pasar la lista completa.
        const res = await fetch(`${PB_URL}/api/collections/${serverPrompts.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                fields: promptsSchema.fields,
                listRule: "",
                viewRule: "",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = author.id",
                deleteRule: "@request.auth.id = author.id"
            })
        });

        if (res.ok) {
            console.log('✅ Campos actualizados.');
        } else {
            const err = await res.json();
            console.error('❌ Error:', JSON.stringify(err, null, 2));
        }
    }
}

updatePromptsFields();
