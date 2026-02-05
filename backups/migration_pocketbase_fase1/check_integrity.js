const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function checkIntegrity() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    const usersRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=500`, {
        headers: { 'Authorization': token }
    });
    const users = await usersRes.json();
    const linked = users.items.filter(u => u.supabase_id).length;

    console.log(`📊 Usuarios en DB: ${users.totalItems}`);
    console.log(`✅ Usuarios vinculados (supabase_id): ${linked}`);

    const promptsRes = await fetch(`${PB_URL}/api/collections/prompts/records`, {
        headers: { 'Authorization': token }
    });
    const prompts = await promptsRes.json();
    console.log(`🖼️ Prompts actuales: ${prompts.totalItems}`);
}

checkIntegrity();
