const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function logFullSchema() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();
    const headers = { 'Authorization': token };

    const collectionsRes = await fetch(`${PB_URL}/api/collections`, { headers });
    const collections = await collectionsRes.json();
    const promptsColl = collections.items.find(c => c.name === 'prompts');

    if (promptsColl) {
        console.log('--- CAMPOS PROMPTS ---');
        console.log(promptsColl.fields.map(f => f.name));
    }
}

logFullSchema();
