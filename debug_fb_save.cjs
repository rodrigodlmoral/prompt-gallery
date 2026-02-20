const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL;
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
const ADMIN_PASS = process.env.PB_ADMIN_PASS.replace(/"/g, '');

async function debugSave() {
    console.log('🐞 Debugging FB Save 500 Error...');
    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

    // Mock Data mimicking what fb-save-page.js sends
    const mockData = {
        page_id: "1234567890",
        page_name: "Debug Page",
        access_token: "MOCK_TOKEN_XYZ",
        status: "active",
        // connected_by: "SOME_USER_ID", // Let's try WITHOUT connected_by first to see if that's the issue
        // Or fetch a real user
    };

    // Get a real user ID
    const users = await pb.collection('users').getList(1, 1);
    const userId = users.items[0]?.id;
    if (userId) {
        console.log('Using User ID:', userId);
        mockData.connected_by = userId;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 59);
    mockData.expires_at = expiresAt.toISOString();

    mockData.debug_info = {
        connected_at: new Date().toISOString(),
        fb_id: "1234567890"
    };

    console.log('Attempting to create record:', mockData);

    try {
        const record = await pb.collection('fb_settings').create(mockData);
        console.log('✅ Success! Record created:', record.id);
        // Clean up
        await pb.collection('fb_settings').delete(record.id);
    } catch (err) {
        console.error('❌ Failed!');
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        console.error('Data:', JSON.stringify(err.data, null, 2));
    }
}

debugSave().catch(console.error);
