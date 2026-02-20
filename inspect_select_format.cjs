const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function inspectExisting() {
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    // Get a working collection with a select field for reference
    try {
        const prompts = await pb.collections.getOne('prompts');
        const selectField = (prompts.fields || prompts.schema || []).find(f => f.type === 'select');
        if (selectField) {
            console.log('=== REFERENCE select field from prompts ===');
            console.log(JSON.stringify(selectField, null, 2));
        }
    } catch (e) {
        console.log('Could not inspect prompts:', e.message);
    }

    // Also check if fb_settings still exists
    try {
        const fb = await pb.collections.getOne('fb_settings');
        console.log('\n=== fb_settings EXISTS ===');
        console.log('Fields:', JSON.stringify(fb.fields || fb.schema || [], null, 2));
    } catch (e) {
        console.log('\n=== fb_settings DOES NOT EXIST ===');
        console.log('Reason:', e.message);
    }
}

inspectExisting().catch(console.error);
