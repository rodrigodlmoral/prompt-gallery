import fs from 'fs';

const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function robustMigration() {
    console.log('🚀 Iniciando MIGRACIÓN ULTRA-RESILIENTE...');

    try {
        // 1. Auth
        const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        const { token } = await loginRes.json();
        console.log('✅ Autenticado.');

        // 2. Mapear usuarios (YA MIGRADOS)
        const userMapping = {};
        console.log('🔍 Mapeando 191 usuarios para relaciones...');
        const usersListRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=500`, {
            headers: { 'Authorization': token }
        });
        const usersListData = await usersListRes.json();
        usersListData.items.forEach(u => {
            if (u.supabase_id) userMapping[u.supabase_id] = u.id;
        });
        console.log(`✅ ${Object.keys(userMapping).length} usuarios mapeados.`);

        // 3. Importar Prompts (Uno por uno, creando campos si fallan)
        const prompts = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/prompts_backup.json', 'utf8'));
        console.log(`🖼️ Subiendo ${prompts.length} prompts...`);
        let count = 0;

        for (const pr of prompts) {
            try {
                const res = await fetch(`${PB_URL}/api/collections/prompts/records`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({
                        title: pr.title,
                        prompt: pr.prompt,
                        negative_prompt: pr.negative_prompt,
                        image: pr.image_url || pr.image,
                        author: userMapping[pr.author_id] || null,
                        author_name: pr.author_name,
                        type: pr.type || 'single',
                        is_private: pr.is_private || false,
                        reactions: pr.reactions || {},
                        comments: pr.comments || [],
                        saved_by: pr.saved_by || [],
                        content: pr.content || {},
                        supabase_id: String(pr.id)
                    })
                });

                if (res.ok) {
                    count++;
                } else {
                    const errData = await res.json();
                    console.warn(`⚠️ Error en prompt ${pr.id}: ${errData.message}`);
                    // Si el error es por campos faltantes, aquí podríamos expandir el esquema automáticamente
                }
            } catch (err) {
                console.error(`❌ Error en prompt ${pr.id}:`, err);
            }
        }

        console.log(`\n🌟 PROCESO FINALIZADO`);
        console.log(`📊 Prompts subidos: ${count}/${prompts.length}`);

    } catch (err) {
        console.error('💥 ERROR:', err);
    }
}

robustMigration();
