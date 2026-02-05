import fs from 'fs';
const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function reimportSchema() {
    console.log('🏗️ Re-importando esquema completo...');

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

    const res = await fetch(`${PB_URL}/api/collections/import`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(schema)
    });

    if (res.ok) {
        console.log('✅ Esquema re-importado con éxito.');
    } else {
        const err = await res.json();
        console.error('❌ Error importando esquema:', JSON.stringify(err, null, 2));
    }
}

reimportSchema();
