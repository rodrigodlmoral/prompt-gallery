const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function cleanup() {
    console.log('🧹 Iniciando limpieza de duplicados...');
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    const promptsRes = await fetch(`${PB_URL}/api/collections/prompts/records?perPage=500`, {
        headers: { 'Authorization': token }
    });
    const data = await promptsRes.json();
    const prompts = data.items;

    const seen = new Set();
    let deletedCount = 0;

    for (const p of prompts) {
        const key = p.supabase_id || p.title;
        if (seen.has(key)) {
            console.log(`🗑️ Borrando duplicado: ${p.title} (${p.id})`);
            await fetch(`${PB_URL}/api/collections/prompts/records/${p.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            deletedCount++;
        } else {
            seen.add(key);
        }
    }

    console.log(`✅ Limpieza completada. Duplicados eliminados: ${deletedCount}`);
}

cleanup();
