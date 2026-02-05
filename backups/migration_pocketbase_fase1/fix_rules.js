const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function fixRules() {
    console.log('🔧 Corrigiendo reglas de API...');

    // 1. Login as Admin
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

    // 2. Get Collections IDs
    const collectionsRes = await fetch(`${PB_URL}/api/collections`, { headers });
    const collections = await collectionsRes.json();

    const promptsColl = collections.items.find(c => c.name === 'prompts');
    const usersColl = collections.items.find(c => c.name === 'users');

    if (promptsColl) {
        console.log('📡 Actualizando reglas de PROMPTS...');
        await fetch(`${PB_URL}/api/collections/${promptsColl.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                listRule: "",
                viewRule: "",
                createRule: "@request.auth.id != ''", // Solo usuarios logueados crean
                updateRule: "@request.auth.id = author", // Solo el autor edita
                deleteRule: "@request.auth.id = author"  // Solo el autor borra
            })
        });
    }

    if (usersColl) {
        console.log('👤 Actualizando reglas de USERS...');
        await fetch(`${PB_URL}/api/collections/${usersColl.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                listRule: "", // Permitir ver lista de creadores
                viewRule: "", // Permitir ver perfiles
                updateRule: "id = @request.auth.id", // Solo el dueño edita
                deleteRule: "id = @request.auth.id"
            })
        });
    }

    console.log('✅ Reglas actualizadas correctamente.');
}

fixRules();
