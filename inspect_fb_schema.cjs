const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL; // Use local .env URL
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function inspectSchema() {
    console.log('🔍 Inspecting fb_settings schema...');
    const pb = new PocketBase(PB_URL);
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        const collection = await pb.collections.getOne('fb_settings');
        console.log('✅ Collection found:', collection.name);
        console.log('📋 Fields:');
        collection.schema.forEach(f => {
            console.log(` - ${f.name} (${f.type}) [Required: ${f.required}]`);
        });
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

inspectSchema();
