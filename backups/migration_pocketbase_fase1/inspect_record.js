const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function inspectRecord() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    const res = await fetch(`${PB_URL}/api/collections/prompts/records?perPage=1`, {
        headers: { 'Authorization': token }
    });
    const data = await res.json();
    console.log('--- RECORD 0 ---');
    console.log(JSON.stringify(data.items[0], null, 2));
}

inspectRecord();
