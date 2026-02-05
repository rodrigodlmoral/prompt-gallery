const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function fixRulesDebug() {
    console.log('🔧 Debugging Reglas de API...');

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

    const collectionsRes = await fetch(`${PB_URL}/api/collections`, { headers });
    const collections = await collectionsRes.json();
    const promptsColl = collections.items.find(c => c.name === 'prompts');

    if (promptsColl) {
        console.log(`📡 Intentando actualizar PROMPTS (ID: ${promptsColl.id})...`);
        const patchRes = await fetch(`${PB_URL}/api/collections/${promptsColl.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                listRule: "",
                viewRule: "",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = author",
                deleteRule: "@request.auth.id = author"
            })
        });
        const patchData = await patchRes.json();
        console.log('Respuesta Server:', JSON.stringify(patchData, null, 2));
    } else {
        console.log('❌ No se encontró la colección prompts');
    }
}

fixRulesDebug();
