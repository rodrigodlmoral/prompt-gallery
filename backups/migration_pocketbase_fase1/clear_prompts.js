const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function clearPrompts() {
    console.log('🗑️ Vaciando colección de prompts...');

    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();
    const headers = { 'Authorization': token };

    // Get all prompts
    const res = await fetch(`${PB_URL}/api/collections/prompts/records?perPage=500`, { headers });
    const data = await res.json();

    console.log(`Borrando ${data.totalItems} registros...`);

    for (const p of data.items) {
        await fetch(`${PB_URL}/api/collections/prompts/records/${p.id}`, {
            method: 'DELETE',
            headers
        });
    }

    console.log('✅ Colección vaciada.');
}

clearPrompts();
