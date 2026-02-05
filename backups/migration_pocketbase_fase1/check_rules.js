const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function checkRules() {
    console.log('🔍 Verificando reglas de API...');
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    const collectionsRes = await fetch(`${PB_URL}/api/collections`, {
        headers: { 'Authorization': token }
    });
    const data = await collectionsRes.json();

    for (const coll of data.items) {
        console.log(`\nCollection: ${coll.name}`);
        console.log(`  List Rule: ${coll.listRule}`);
        console.log(`  View Rule: ${coll.viewRule}`);
        console.log(`  Create Rule: ${coll.createRule}`);
        console.log(`  Update Rule: ${coll.updateRule}`);
        console.log(`  Delete Rule: ${coll.deleteRule}`);
    }
}

checkRules();
