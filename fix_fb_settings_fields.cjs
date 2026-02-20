const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function createFbSettings() {
    console.log('🔧 Creating fb_settings collection (PB v0.22+ format)...');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    // Double-check it doesn't exist
    try {
        await pb.collections.getOne('fb_settings');
        console.log('⚠️ fb_settings already exists! Deleting first...');
        const col = await pb.collections.getOne('fb_settings');
        await pb.collections.delete(col.id);
    } catch (e) {
        // Expected - doesn't exist
    }

    // Create with PB v0.22+ field format (values/maxSelect at top level)
    await pb.collections.create({
        name: 'fb_settings',
        type: 'base',
        fields: [
            {
                name: 'page_id',
                type: 'text',
                required: true,
            },
            {
                name: 'page_name',
                type: 'text',
                required: false,
            },
            {
                name: 'access_token',
                type: 'text',
                required: true,
            },
            {
                name: 'status',
                type: 'select',
                required: true,
                maxSelect: 1,
                values: ['active', 'expired', 'error'],  // TOP-LEVEL, not in options!
            },
            {
                name: 'connected_by',
                type: 'text',
                required: false,
            },
            {
                name: 'expires_at',
                type: 'date',
                required: false,
            },
            {
                name: 'debug_info',
                type: 'json',
                required: false,
            }
        ],
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null
    });

    console.log('✅ fb_settings created!');

    // Verify
    const verified = await pb.collections.getOne('fb_settings');
    const fieldNames = (verified.fields || []).map(f => f.name);
    console.log('📋 Fields:', fieldNames.join(', '));

    const required = ['page_id', 'access_token', 'status', 'expires_at'];
    const missing = required.filter(f => !fieldNames.includes(f));

    if (missing.length === 0) {
        console.log('✅ VERIFICATION PASSED! Collection is ready.');
    } else {
        console.log('❌ Missing:', missing.join(', '));
    }
}

createFbSettings().catch(console.error);
