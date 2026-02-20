import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function testParams() {
    try {
        console.log("🔑 Autenticando...");
        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("🔍 Test 1: Simple List...");
        const res1 = await pb.collection('facebook_queue').getList(1, 10);
        console.log("✅ Test 1 Success (Count:", res1.totalItems, ")");

        console.log("🔍 Test 2: List with Sort (created)...");
        const res2 = await pb.collection('facebook_queue').getList(1, 10, { sort: 'created' });
        console.log("✅ Test 2 Success");

        console.log("🔍 Test 3: List with Expand (prompt)...");
        try {
            const res3 = await pb.collection('facebook_queue').getList(1, 10, { expand: 'prompt' });
            console.log("✅ Test 3 Success");
        } catch (e) {
            console.error("❌ Test 3 Fail:", e.data || e.message);
        }

        console.log("🔍 Test 4: List with Expand (added_by)...");
        try {
            const res4 = await pb.collection('facebook_queue').getList(1, 10, { expand: 'added_by' });
            console.log("✅ Test 4 Success");
        } catch (e) {
            console.error("❌ Test 4 Fail:", e.data || e.message);
        }

        console.log("🔍 Test 5: Full Expand...");
        try {
            const res5 = await pb.collection('facebook_queue').getList(1, 10, { expand: 'prompt,added_by' });
            console.log("✅ Test 5 Success");
        } catch (e) {
            console.error("❌ Test 5 Fail:", e.data || e.message);
        }

    } catch (err) {
        console.error("❌ Auth/Total Fail:", err.message);
    }
}

testParams();
