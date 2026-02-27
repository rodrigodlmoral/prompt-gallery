const PocketBase = require('pocketbase/cjs');
require('dotenv').config();
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);

async function patch() {
    await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

    const ledgerColl = await pb.collections.getOne('ledger');
    const oldRule = ledgerColl.createRule;
    const newRule = "@request.auth.id != '' && (to_user = @request.auth.id || from_user = @request.auth.id)";

    console.log("Old Create Rule:", oldRule);

    if (oldRule !== newRule) {
        ledgerColl.createRule = newRule;
        await pb.collections.update('ledger', ledgerColl);
        console.log("Successfully updated Ledger Create Rule to:", newRule);
    } else {
        console.log("Rule is already correct.");
    }
}
patch().catch(console.error);
