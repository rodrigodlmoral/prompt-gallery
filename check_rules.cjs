const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function check() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    const ledgerColl = await pb.collections.getOne('ledger');
    console.log("Ledger Create Rule:", ledgerColl.createRule);
    console.log("Ledger Update Rule:", ledgerColl.updateRule);
    console.log("Users Update Rule:", (await pb.collections.getOne('users')).updateRule);
}
check().catch(console.error);
