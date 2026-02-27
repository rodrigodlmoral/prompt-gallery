const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function check() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    const user = await pb.collection('users').getFirstListItem('username="rodrigodlmoral"');
    console.log("User:", user.username, "Tokens:", user.tokens);

    const ledgers = await pb.collection('ledger').getList(1, 10, {
        filter: `from_user="${user.id}" || to_user="${user.id}"`,
        sort: '-created'
    });

    console.log("Recent Ledgers:");
    for (const l of ledgers.items) {
        console.log(`- Type: ${l.type} | Amount: ${l.amount} | From: ${l.from_user} | To: ${l.to_user} | Desc: ${l.description}`);
    }
}
check().catch(console.error);
