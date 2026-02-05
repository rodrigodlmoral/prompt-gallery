const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function debugSchema() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    console.log('🔍 Listando colecciones actuales...');
    const listRes = await fetch(`${PB_URL}/api/collections`, {
        headers: { 'Authorization': token }
    });
    const listData = await listRes.json();
    console.log('📋 Colecciones encontradas:', listData.items.map(c => c.name));

    console.log('\n🧪 Intentando crear colección "prompts" manualmente...');
    const createRes = await fetch(`${PB_URL}/api/collections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({
            name: 'prompts',
            type: 'base',
            fields: [
                { "id": "p_t_0000000001", "name": "title", "type": "text", "required": true },
                { "id": "p_p_0000000002", "name": "prompt", "type": "text" }
            ]
        })
    });

    const createData = await createRes.json();
    console.log('📡 Respuesta de creación:', JSON.stringify(createData, null, 2));
}

debugSchema();
