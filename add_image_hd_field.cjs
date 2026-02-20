const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function addImageHdField() {
    console.log('📐 ADD IMAGE_HD FIELD — Prompts Schema Migration');
    const pb = new PocketBase(PB_URL);

    try {
        const adminEmail = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
        const adminPass = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

        if (!adminEmail || !adminPass) {
            console.error('❌ ERROR: PB_ADMIN_EMAIL y PB_ADMIN_PASS son requeridos en .env');
            process.exit(1);
        }

        await pb.admins.authWithPassword(adminEmail, adminPass);
        console.log('✅ Autenticación exitosa');
    } catch (err) {
        console.error('❌ Error de autenticación:', err.message);
        process.exit(1);
    }

    try {
        const promptsColl = await pb.collections.getOne('prompts');
        const existingField = promptsColl.fields.find(f => f.name === 'image_hd');

        if (existingField) {
            console.log('ℹ️  El campo "image_hd" YA EXISTE.');
            return;
        }

        console.log('🔧 Agregando campo "image_hd"...');
        const updatedFields = [
            ...promptsColl.fields,
            {
                name: 'image_hd',
                type: 'url',
                required: false,
                options: {
                    exceptDomains: null,
                    onlyDomains: null
                }
            }
        ];

        await pb.collections.update(promptsColl.id, {
            fields: updatedFields
        });
        console.log('✅ Campo "image_hd" agregado exitosamente.');
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.data) console.error(JSON.stringify(err.data, null, 2));
        process.exit(1);
    }
}

addImageHdField();
