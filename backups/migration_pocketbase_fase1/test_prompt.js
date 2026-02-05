import fs from 'fs';

const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function testOnePrompt() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    const prompts = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/prompts_backup.json', 'utf8'));
    const pr = prompts[0];

    console.log('🧪 Probando importación de prompt ID:', pr.id);
    const res = await fetch(`${PB_URL}/api/collections/prompts/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({
            title: pr.title,
            prompt: pr.prompt,
            image: pr.image_url || pr.image, // Usar image_url si existe
            author_name: pr.author_name,
            type: pr.type || 'single',
            supabase_id: String(pr.id)
        })
    });

    const data = await res.json();
    console.log('📡 Respuesta de API:', JSON.stringify(data, null, 2));
}

testOnePrompt();
