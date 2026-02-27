const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function run() {
    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        const users = await pb.collection('users').getList(1, 1);
        const allPrompts = await pb.collection('prompts').getList(1, 1);

        const allUsers = await pb.collection('users').getFullList({ fields: 'tokens' });
        const totalCirculating = allUsers.reduce((sum, u) => sum + (u.tokens || 0), 0);

        console.log(`Total_Users: ${users.totalItems}`);
        console.log(`Total_Prompts: ${allPrompts.totalItems}`);
        console.log(`Economy_Tokens: ${totalCirculating}`);

    } catch (err) {
        console.error(err);
    }
}
run();
