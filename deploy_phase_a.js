import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function deployPhaseA() {
    try {
        console.log('Autenticando como Admin...');
        await pb.admins.authWithPassword('rodridom.rock@gmail.com', 'alcaline01#pock');
        console.log('✅ Autenticado exitosamente.\n');

        // LIMPIEZA
        try {
            await pb.collections.delete('referrals');
            console.log('✅ Colección anterior eliminada.');
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { }

        // 1. Crear colección 'referrals'
        console.log('\n--- 1. Creando colección "referrals" ---');
        const referralsSchema = {
            name: 'referrals',
            type: 'base',
            // En v0.20+ se usa 'schema', pero internamente la API puede devolver 'fields'
            schema: [
                {
                    name: 'referrer',
                    type: 'relation',
                    required: true,
                    options: { collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 }
                },
                {
                    name: 'referred',
                    type: 'relation',
                    required: true,
                    options: { collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 }
                },
                {
                    name: 'code',
                    type: 'text',
                    required: true
                },
                {
                    name: 'is_active',
                    type: 'bool',
                    required: false
                },
                {
                    name: 'registered_at',
                    type: 'date',
                    required: true
                },
                {
                    name: 'activated_at',
                    type: 'date',
                    required: false
                }
            ],
            indexes: [],
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
            deleteRule: ""
        };

        await pb.collections.create(referralsSchema);
        console.log('✅ Colección "referrals" creada exitosamente.');

        // 2. Actualizar colección 'users'
        console.log('\n--- 2. Actualizando colección "users" ---');
        const usersCollection = await pb.collections.getOne('users');

        let schemaUpdated = false;
        // Compatibilidad API: v0.20+ usa 'schema', pero migraciones viejas usan 'fields'
        const baseSchema = usersCollection.schema || usersCollection.fields || [];
        const newSchema = [...baseSchema];

        if (!newSchema.some(field => field.name === 'referral_code')) {
            console.log('Añadiendo campo "referral_code"...');
            newSchema.push({
                name: 'referral_code',
                type: 'text',
                required: false,
                options: { min: null, max: null, pattern: '^PG[A-Z0-9]{8}$' }
            });
            schemaUpdated = true;
        }

        if (!newSchema.some(field => field.name === 'active_referrals_count')) {
            console.log('Añadiendo campo "active_referrals_count"...');
            newSchema.push({
                name: 'active_referrals_count',
                type: 'number',
                required: false,
                options: { min: 0 }
            });
            schemaUpdated = true;
        }

        if (schemaUpdated) {
            try {
                // Restauramos en la propiedad correcta
                if (usersCollection.schema !== undefined) {
                    usersCollection.schema = newSchema;
                } else {
                    usersCollection.fields = newSchema;
                }

                await pb.collections.update('users', usersCollection);
                console.log('✅ Colección "users" actualizada exitosamente.');
            } catch (e) {
                console.error("❌ Error al actualizar users:");
                console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
            }
        } else {
            console.log('✅ La colección "users" ya tiene todos los campos necesarios.');
        }

        console.log('\n=============================================');
        console.log('🎉 FASE A COMPLETA. Base de datos preparada.');
        console.log('=============================================');

    } catch (err) {
        console.error('❌ ERROR CRÍTICO:', err.message);
        if (err.response) console.error('Detalles:', JSON.stringify(err.response, null, 2));
    }
}

deployPhaseA();
