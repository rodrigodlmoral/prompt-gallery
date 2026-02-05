import fs from 'fs';

// --- CONFIGURACIÓN ---
const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

// --- HELPERS ---
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runImport() {
    console.log('🚀 Iniciando proceso de migración v3.1 (Respetando Rate Limits)...');

    try {
        // 1. Login Admin
        console.log('🔑 Intentando autenticación...');
        const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });

        if (!loginRes.ok) {
            const errText = await loginRes.text();
            throw new Error(`Error de login (Status ${loginRes.status}): ${errText.slice(0, 100)}`);
        }
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Autenticado como Superuser.');

        // 2. Importar Esquema (SALTADO - Configurado manualmente)
        /*
        console.log('🏗️ Configurando colecciones...');
        const schema = JSON.parse(fs.readFileSync('./pb_schema.json', 'utf8'));
        const schemaRes = await fetch(`${PB_URL}/api/collections/import`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(schema)
        });

        if (!schemaRes.ok) {
            const schemaErr = await schemaRes.json();
            console.warn('⚠️ Nota sobre esquema:', schemaErr.message);
        } else {
            console.log('✅ Esquema configurado.');
        }
        */

        // 3. Cargar Datos Locales
        const profiles = JSON.parse(fs.readFileSync('./profiles_backup.json', 'utf8'));
        const prompts = JSON.parse(fs.readFileSync('./prompts_backup.json', 'utf8'));

        // 4. Importar Usuarios (con optimización de ya existentes)
        console.log(`👤 Recuperando usuarios existentes de PocketBase...`);
        const existingUsersRes = await fetch(`${PB_URL}/api/collections/users/records?perPage=500`, {
            headers: { 'Authorization': token }
        });
        const existingUsersData = await existingUsersRes.json();
        const existingUsers = existingUsersData.items || [];

        const userMapping = {};
        existingUsers.forEach(u => {
            if (u.supabase_id) userMapping[u.supabase_id] = u.id;
            else if (u.email) userMapping[u.email] = u.id; // Fallback por email
        });

        console.log(`👤 Usuarios encontrados en DB: ${existingUsers.length}`);
        console.log(`👤 Importando/Verificando ${profiles.length} usuarios...`);

        for (const p of profiles) {
            // Si ya existe, saltar creación pero asegurar que está en el mapeo
            if (userMapping[p.id]) {
                continue;
            }

            try {
                process.stdout.write(`.`); // Progreso visual
                const res = await fetch(`${PB_URL}/api/collections/users/records`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({
                        username: p.username || `user_${p.id.slice(0, 5)}`,
                        email: p.email,
                        emailVisibility: true,
                        password: 'Password123!',
                        passwordConfirm: 'Password123!',
                        name: p.username,
                        avatar_url: p.avatar_url,
                        tokens: p.tokens || 0,
                        xp: p.xp || 0,
                        level: p.level || 0,
                        socials: p.socials || {},
                        role: (p.username === 'rodrigodlmoral' || p.username === 'rodridomrock') ? 'admin' : (p.role || 'user'),
                        followers: p.followers || [],
                        following: p.socials?._following || p.following || [],
                        saved_prompts: p.socials?._saved || p.saved_prompts || [],
                        supabase_id: p.id
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    userMapping[p.id] = data.id;
                    await delay(500); // Retraso mayor para evitar 429
                } else if (res.status === 429) {
                    throw new Error("RATE_LIMIT");
                } else {
                    const findRes = await fetch(`${PB_URL}/api/collections/users/records?filter=(email='${p.email}')`, {
                        headers: { 'Authorization': token }
                    });
                    const findData = await findRes.json();
                    if (findData.items && findData.items.length > 0) {
                        userMapping[p.id] = findData.items[0].id;
                    }
                    await delay(300);
                }
            } catch (err) {
                if (err.message === "RATE_LIMIT") throw err;
                console.error(`\n❌ Error con usuario ${p.id}:`, err.message);
            }
        }

        // 5. Importar Prompts
        console.log(`\n🖼️ Importando ${prompts.length} prompts...`);
        let promptCount = 0;
        for (const pr of prompts) {
            try {
                process.stdout.write(`.`); // Progreso visual
                const authorPbId = userMapping[pr.author_id] || null;
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
                        image: pr.image,
                        author: authorPbId,
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
                if (res.ok) promptCount++;
                else if (res.status === 429) throw new Error("RATE_LIMIT");

                await delay(500); // 500ms entre prompts para seguridad (429)
            } catch (err) {
                if (err.message === "RATE_LIMIT") throw err;
                console.error(`\n❌ Error en prompt ${pr.id}:`, err.message);
            }
        }

        console.log(`\n\n✨ MIGRACIÓN FINALIZADA ✨`);
        console.log(`📊 Usuarios: ${Object.keys(userMapping).length}`);
        console.log(`📊 Prompts: ${promptCount}`);

    } catch (error) {
        if (error.message === "RATE_LIMIT") {
            console.error('\n🛑 BLOQUEO DE POCKETHOST (429). Espera 15 minutos e intenta de nuevo.');
        } else {
            console.error('\n💥 ERROR CRÍTICO:', error);
        }
    }
}

runImport();
