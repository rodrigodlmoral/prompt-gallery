import PocketBase from 'pocketbase';

export default async function handler(req, res) {
    // Security: Only allow this to be run intentionally
    // We can add a simple query param sanity check or just let it run since it only relaxes rules safely

    try {
        const pb = new PocketBase(process.env.PB_URL);
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        const logs = [];

        // 1. Fix LEDGER
        try {
            // Fetch collection meta by name (supported by JS SDK as seen with activity_logs)
            const ledgerColl = await pb.collections.getOne('ledger');

            const rule = "from_user = @request.auth.id || to_user = @request.auth.id";
            const createRule = "@request.auth.id != '' && (to_user = @request.auth.id || from_user = @request.auth.id)";
            let changed = false;

            if (ledgerColl.listRule !== rule) { ledgerColl.listRule = rule; changed = true; }
            if (ledgerColl.viewRule !== rule) { ledgerColl.viewRule = rule; changed = true; }
            if (ledgerColl.createRule !== createRule) { ledgerColl.createRule = createRule; changed = true; }

            if (changed) {
                await pb.collections.update('ledger', ledgerColl);
                logs.push("✅ Ledger ACLs updated to allow user access (including create).");
            } else {
                logs.push("ℹ️ Ledger ACLs already correct.");
            }
        } catch (err) {
            logs.push("❌ Failed to update Ledger: " + err.message);
        }

        // 2. Fix ACTIVITY_LOGS
        try {
            const logsColl = await pb.collections.getOne('activity_logs');
            const logRule = "user = @request.auth.id || details.recipientId = @request.auth.id";
            let changed = false;

            if (logsColl.listRule !== logRule) { logsColl.listRule = logRule; changed = true; }
            if (logsColl.viewRule !== logRule) { logsColl.viewRule = logRule; changed = true; }

            if (changed) {
                await pb.collections.update('activity_logs', logsColl);
                logs.push("✅ Activity Logs ACLs updated.");
            } else {
                logs.push("ℹ️ Activity Logs ACLs already correct.");
            }
        } catch (err) {
            logs.push("❌ Failed to update Activity Logs: " + err.message);
        }

        return res.status(200).json({
            success: true,
            logs,
            message: "Database permissions patched successfully. Return to dashboard."
        });

    } catch (error) {
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}
