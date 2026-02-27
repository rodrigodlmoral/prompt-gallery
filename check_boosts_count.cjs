const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function run() {
    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
        const weeklyBoosts = await pb.collection('active_boosts').getList(1, 50, {
            filter: 'tier="weekly" && expires_at > @now'
        });
        const dailyBoosts = await pb.collection('active_boosts').getList(1, 50, {
            filter: 'tier="daily" && expires_at > @now'
        });

        console.log(`Weekly Boosts Active: ${weeklyBoosts.totalItems}`);
        weeklyBoosts.items.forEach(b => console.log(` - Prompt: ${b.prompt_id} (Expires: ${b.expires_at})`));

        console.log(`\nDaily Boosts Active: ${dailyBoosts.totalItems}`);
        dailyBoosts.items.forEach(b => console.log(` - Prompt: ${b.prompt_id} (Expires: ${b.expires_at})`));

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
