/**
 * create_fb_settings.cjs
 * 
 * Creates the 'fb_settings' collection in PocketBase to store
 * the Facebook Page Access Token securely.
 * 
 * Fields:
 * - page_id (text, required)
 * - page_name (text)
 * - access_token (text, required, hidden)
 * - status (select: active, expired, error)
 * - connected_by (relation -> users)
 * - expires_at (date)
 * 
 * Usage: node create_fb_settings.cjs
 */

const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';
const ADMIN_EMAIL = (process.env.PB_ADMIN_EMAIL || '').replace(/"/g, '');
const ADMIN_PASS = (process.env.PB_ADMIN_PASS || '').replace(/"/g, '');

async function createFbSettingsCollection() {
    console.log('═'.repeat(60));
    console.log('🛠️  Creating "fb_settings" Collection');
    console.log('═'.repeat(60));

    if (!ADMIN_EMAIL || !ADMIN_PASS) {
        console.error('❌ Error: PB_ADMIN_EMAIL and PB_ADMIN_PASS required in .env');
        process.exit(1);
    }

    const pb = new PocketBase(PB_URL);

    try {
        console.log('🔐 Authenticating as Admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log('✅ Auth successful.');

        // 1. Check if exists
        try {
            const existing = await pb.collections.getOne('fb_settings');
            console.log('⚠️  Collection "fb_settings" already exists. Updating schema...');

            // We'll update it to ensure fields match
            await pb.collections.update(existing.id, {
                schema: [
                    { name: 'page_id', type: 'text', required: true, options: {} },
                    { name: 'page_name', type: 'text', required: false, options: {} },
                    { name: 'access_token', type: 'text', required: true, options: {} }, // protected by ACLs
                    {
                        name: 'status',
                        type: 'select',
                        required: true,
                        options: { values: ['active', 'expired', 'error'], maxSelect: 1 }
                    },
                    {
                        name: 'connected_by',
                        type: 'relation',
                        required: false,
                        options: { collectionId: 'users', cascadeDelete: false, maxSelect: 1 }
                    },
                    { name: 'expires_at', type: 'date', required: false, options: {} },
                    { name: 'debug_info', type: 'json', required: false, options: {} }
                ]
            });
            console.log('✅ Schema updated.');

        } catch (err) {
            if (err.status === 404) {
                console.log('✨ Creating new collection "fb_settings"...');
                await pb.collections.create({
                    name: 'fb_settings',
                    type: 'base',
                    schema: [
                        { name: 'page_id', type: 'text', required: true, options: {} },
                        { name: 'page_name', type: 'text', required: false, options: {} },
                        { name: 'access_token', type: 'text', required: true, options: {} },
                        {
                            name: 'status',
                            type: 'select',
                            required: true,
                            options: { values: ['active', 'expired', 'error'], maxSelect: 1 }
                        },
                        {
                            name: 'connected_by',
                            type: 'relation',
                            required: false,
                            options: { collectionId: 'users', cascadeDelete: false, maxSelect: 1 }
                        },
                        { name: 'expires_at', type: 'date', required: false, options: {} },
                        { name: 'debug_info', type: 'json', required: false, options: {} }
                    ],
                    // ACL Rules: STRICT! Only admins can write.
                    // Reading is also restricted to admins to protect the token.
                    listRule: null,   // Only admins
                    viewRule: null,   // Only admins
                    createRule: null, // Only admins
                    updateRule: null, // Only admins
                    deleteRule: null  // Only admins
                });
                console.log('✅ Collection created successfully.');
            } else {
                throw err;
            }
        }

    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (error.data) console.error('   Details:', JSON.stringify(error.data, null, 2));
        process.exit(1);
    }
}

createFbSettingsCollection();
