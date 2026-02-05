const PB_URL = 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = 'rodridom.rock@gmail.com';
const ADMIN_PASS = 'alcaline01#pock';

async function fixUsersAndRelations() {
    const loginRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await loginRes.json();

    console.log('🔍 Obteniendo esquema actual de "users"...');
    const getRes = await fetch(`${PB_URL}/api/collections/users`, {
        headers: { 'Authorization': token }
    });
    const collection = await getRes.json();

    console.log('🛠️ Inyectando nuevos campos...');
    // Evitar duplicados
    const newFields = [
        { "name": "avatar_url", "type": "url" },
        { "name": "tokens", "type": "number", "min": 0 },
        { "name": "xp", "type": "number", "min": 0 },
        { "name": "level", "type": "number", "min": 0 },
        { "name": "socials", "type": "json" },
        { "name": "supabase_id", "type": "text" }
    ];

    newFields.forEach(nf => {
        if (!collection.fields.find(f => f.name === nf.name)) {
            collection.fields.push(nf);
        }
    });

    const patchRes = await fetch(`${PB_URL}/api/collections/users`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ fields: collection.fields })
    });

    if (patchRes.ok) {
        console.log('✅ Estructura de usuarios actualizada.');

        // VINCULAR DATOS
        console.log('🔗 Vinculando supabase_id a los usuarios existentes...');
        const profiles = JSON.parse(await fs.promises.readFile('./backups/migration_pocketbase_fase1/profiles_backup.json', 'utf8'));

        for (const p of profiles) {
            const findRes = await fetch(`${PB_URL}/api/collections/users/records?filter=(email='${p.email}')`, {
                headers: { 'Authorization': token }
            });
            const findData = await findRes.json();
            if (findData.items && findData.items.length > 0) {
                const u = findData.items[0];
                await fetch(`${PB_URL}/api/collections/users/records/${u.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({
                        supabase_id: p.id,
                        tokens: p.tokens,
                        xp: p.xp,
                        level: p.level,
                        socials: p.socials
                    })
                });
            }
        }
        console.log('🌟 VINCULACIÓN COMPLETADA.');
    } else {
        console.error('❌ Error configurando usuarios:', await patchRes.text());
    }
}

fixUsersAndRelations();
