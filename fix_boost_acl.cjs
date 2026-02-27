const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function run() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    // Get collection
    const collection = await pb.collections.getOne('boosts');
    console.log("BEFORE:");
    console.log(`  List Rule: ${collection.listRule}`);
    console.log(`  View Rule: ${collection.viewRule}`);
    console.log(`  Create Rule: ${collection.createRule}`);
    console.log(`  Update Rule: ${collection.updateRule}`);
    console.log(`  Delete Rule: ${collection.deleteRule}`);

    // Update: Make List and View public (empty string = anyone can read)
    // Keep Create/Update/Delete restricted to the owner
    await pb.collections.update('boosts', {
        listRule: '',    // Public read - anyone can list boosts
        viewRule: '',    // Public read - anyone can view a boost
    });

    // Verify
    const updated = await pb.collections.getOne('boosts');
    console.log("\nAFTER:");
    console.log(`  List Rule: ${updated.listRule === null ? '(null = public)' : updated.listRule || '(empty = public)'}`);
    console.log(`  View Rule: ${updated.viewRule === null ? '(null = public)' : updated.viewRule || '(empty = public)'}`);
    console.log(`  Create Rule: ${updated.createRule}`);
    console.log(`  Update Rule: ${updated.updateRule}`);

    // Test unauth access
    pb.authStore.clear();
    try {
        const boosts = await pb.collection('boosts').getFullList({
            filter: 'is_active=true'
        });
        console.log(`\nUnauth test: ${boosts.length} active boosts visible ✅`);
    } catch (e) {
        console.log(`\nUnauth test FAILED: ${e.message}`);
    }
}
run();
