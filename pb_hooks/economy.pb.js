/// <reference path="../pb_data/types.d.ts" />

onAfterBootstrap((e) => {
    console.log("[ECONOMY_HOOK] Checking System ACLs...");

    try {
        // 1. Fix LEDGER Permissions
        // Allow users to see transactions where they are sender OR receiver
        try {
            const ledger = $app.dao().findCollectionByNameOrId("ledger");
            const rule = "from_user = @request.auth.id || to_user = @request.auth.id";

            if (ledger.listRule !== rule || ledger.viewRule !== rule) {
                ledger.listRule = rule;
                ledger.viewRule = rule;
                $app.dao().saveCollection(ledger);
                console.log("[ECONOMY_HOOK] Updated 'ledger' ACLs: Allowed user access.");
            }
        } catch (lErr) {
            console.warn("[ECONOMY_HOOK] Ledger collection check failed (might not exist yet): " + lErr);
        }

        // 2. Fix ACTIVITY_LOGS Permissions
        // Allow users to see logs where they are the 'user' OR the 'recipient' (in details)
        try {
            const logs = $app.dao().findCollectionByNameOrId("activity_logs");
            // Note: filtering by JSON fields in rules can be expensive/complex.
            // Safe fallback: user = @request.auth.id
            // For recipient visibility, simply relying on client-side or dual-write is safer, 
            // but we can try to add the rule if supported. 
            // Let's stick to standard ownership for safety first.
            const logRule = "user = @request.auth.id";

            if (logs.listRule !== logRule) {
                logs.listRule = logRule;
                logs.viewRule = logRule;
                $app.dao().saveCollection(logs);
                console.log("[ECONOMY_HOOK] Updated 'activity_logs' ACLs.");
            }
        } catch (aErr) {
            console.warn("[ECONOMY_HOOK] Activity Logs check failed: " + aErr);
        }

    } catch (err) {
        console.error("[ECONOMY_HOOK] Critical Error updating ACLs: " + err);
    }
});
