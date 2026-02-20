
// Native fetch is available in Node 18+
require('dotenv').config();

const PB_URL = (process.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '');
const EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function checkEndpoints() {
    console.log('Testing endpoints on:', PB_URL);

    // 1. Try Legacy Admins Endpoint
    console.log('\n--- Testing /api/admins/auth-with-password ---');
    try {
        const res1 = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: EMAIL, password: PASS })
        });
        console.log('Status:', res1.status);
        if (res1.ok) {
            console.log('✅ LEGACY ENDPOINT WORKS');
        } else {
            console.log('❌ Failed');
        }
    } catch (e) {
        console.log('Exception:', e.message);
    }

    // 2. Try New Superusers Endpoint
    console.log('\n--- Testing /api/collections/_superusers/auth-with-password ---');
    try {
        const res2 = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: EMAIL, password: PASS })
        });
        console.log('Status:', res2.status);
        if (res2.ok) {
            console.log('✅ SUPERUSERS ENDPOINT WORKS');
        } else {
            console.log('❌ Failed');
        }
    } catch (e) {
        console.log('Exception:', e.message);
    }
}

checkEndpoints();
