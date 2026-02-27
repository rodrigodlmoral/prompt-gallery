const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function run() {
    // Test 1: As admin
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    console.log("=== ADMIN VIEW ===");
    const allBoosts = await pb.collection('boosts').getFullList({
        filter: 'is_active=true',
        sort: '-purchased_at'
    });
    console.log(`Total Active Boosts: ${allBoosts.length}`);
    allBoosts.forEach(b => console.log(`  - Type: ${b.type}, User: ${b.user}, Prompt: ${b.prompt}, Expires: ${b.expires_at}`));

    // Test 2: As unauthenticated user
    pb.authStore.clear();
    console.log("\n=== UNAUTH VIEW ===");
    try {
        const unAuthBoosts = await pb.collection('boosts').getFullList({
            filter: 'is_active=true'
        });
        console.log(`Unauth Active Boosts: ${unAuthBoosts.length}`);
    } catch (e) {
        console.log(`Unauth ERROR: ${e.status} - ${e.message}`);
    }

    // Test 3: Check collection rules
    console.log("\n=== COLLECTION RULES ===");
    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        const collection = await pb.collections.getOne('boosts');
        console.log(`List Rule: ${collection.listRule || '(admin only)'}`);
        console.log(`View Rule: ${collection.viewRule || '(admin only)'}`);
    } catch (e) {
        console.log(`Error reading rules: ${e.message}`);
    }
}
run();
