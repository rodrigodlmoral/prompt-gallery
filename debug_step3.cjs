const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function debugStep3() {
    console.log('🐞 Debugging SDK Internals...');

    const pb = new PocketBase(PB_URL);

    // HOOK TO SPY ON REQUESTS
    pb.beforeSend = function (url, options) {
        console.log('\n--- SDK REQUEST ---');
        console.log('URL:', url);
        console.log('Method:', options.method);
        console.log('Headers:', JSON.stringify(options.headers || {}, null, 2));
        return { url, options };
    };

    // 1. Auth
    try {
        console.log('Attempting Auth...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log('✅ Admin Auth OK');
    } catch (e) {
        console.error('❌ Auth Failed:', e.message);
        return;
    }

    // 2. List
    console.log('\nAttempting List...');
    try {
        const list = await pb.collection('fb_settings').getList(1, 1, {
            sort: '-created',
            requestKey: null
        });
        console.log('✅ List OK. Items:', list.items.length);
    } catch (e) {
        console.error('❌ List Failed:', e.message);
    }
}

debugStep3();
