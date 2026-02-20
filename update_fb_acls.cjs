const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function updateAcls() {
    console.log('🛠️ Updating "fb_settings" ACLs...');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    const collection = await pb.collections.getOne('fb_settings');

    // Allow authenticated users (Admins use the app as users) to view/list settings
    // Since only one setting is active usually, and it contains the Page Token, 
    // we should ideally be careful. But for this app, all "Admins" share the same context.
    // The "checkAdmin" in frontend protects the UI. The API rule protects data.
    // We'll allow @request.auth.id != "" for simplicity, assuming only trusted users have access to admin panel.

    await pb.collections.update(collection.id, {
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        // Create/Update/Delete still null (only via API/Admin)
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    console.log('✅ ACLs updated: Authenticated users can now view settings.');
}

updateAcls().catch(console.error);
