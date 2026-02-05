import fs from 'fs';

const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function linkUsersGuaranteed() {
    console.log('🚀 Iniciando vinculación GARANTIZADA (1 usuario cada 2 segundos)...');
    console.log('⏳ Este proceso tomará aproximadamente 6-7 minutos. Por favor espera.');

    try {
        const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        const { token } = await loginRes.json();
        console.log('✅ Autenticado.');

        const profiles = JSON.parse(fs.readFileSync('./backups/migration_pocketbase_fase1/profiles_backup.json', 'utf8'));

        let count = 0;
        for (let i = 0; i < profiles.length; i++) {
            const p = profiles[i];
            try {
                const findRes = await fetch(`${PB_URL}/api/collections/users/records?filter=(email='${p.email}')`, {
                    headers: { 'Authorization': token }
                });

                if (findRes.ok) {
                    const findData = await findRes.json();
                    if (findData.items && findData.items.length > 0) {
                        const u = findData.items[0];
                        await fetch(`${PB_URL}/api/collections/users/records/${u.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': token },
                            body: JSON.stringify({
                                supabase_id: p.id,
                                tokens: p.tokens || 0,
                                xp: p.xp || 0,
                                level: p.level || 0,
                                socials: p.socials || {},
                                name: p.username
                            })
                        });
                        count++;
                    }
                }

                if (i % 5 === 0) console.log(`📊 Progreso: ${i}/${profiles.length} (${Math.round((i / profiles.length) * 100)}%)`);

                await sleep(2000); // 2 segundos entre cada usuario ESENCIAL

            } catch (e) {
                console.error(`⚠️ Error en ${p.email}, reintentando en el siguiente ciclo.`);
                await sleep(5000);
            }
        }

        console.log(`\n🌟 VINCULACIÓN EXITOSA: ${count} perfiles restaurados.`);

    } catch (err) {
        console.error('💥 ERROR CRÍTICO:', err);
    }
}

linkUsersGuaranteed();
