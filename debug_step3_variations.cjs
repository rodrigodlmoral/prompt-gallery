const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function debugVariations() {
    console.log('🐞 Debugging Variations...');
    const pb = new PocketBase(PB_URL);

    // Auth
    try {
        await pb.admins.authWithPassword(EMAIL, PASS);
        console.log('✅ Auth OK');
    } catch (e) {
        console.error('❌ Auth Failed', e);
        return;
    }

    // Test 1: Simple List
    process.stdout.write('\nTest 1: Simple getList(1, 1)... ');
    try {
        await pb.collection('fb_settings').getList(1, 1);
        console.log('✅ OK');
    } catch (e) {
        console.log('❌ FAILED:', e.status);
    }

    // Test 2: Sort
    process.stdout.write('Test 2: getList(1, 1, { sort: "-created" })... ');
    try {
        await pb.collection('fb_settings').getList(1, 1, { sort: '-created' });
        console.log('✅ OK');
    } catch (e) {
        console.log('❌ FAILED:', e.status);
    }

    // Test 3: RequestKey
    process.stdout.write('Test 3: getList(1, 1, { requestKey: null })... ');
    try {
        await pb.collection('fb_settings').getList(1, 1, { requestKey: null });
        console.log('✅ OK');
    } catch (e) {
        console.log('❌ FAILED:', e.status);
    }

    // Test 4: Both
    process.stdout.write('Test 4: Both... ');
    try {
        await pb.collection('fb_settings').getList(1, 1, { sort: '-created', requestKey: null });
        console.log('✅ OK');
    } catch (e) {
        console.log('❌ FAILED:', e.status);
    }
}

debugVariations();
