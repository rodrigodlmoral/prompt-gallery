/// <reference path="../pb_data/types.d.ts" />

/**
 * REGISTRATION BONUS HOOK
 * Automatically adds a registration bonus to the ledger when a new user is created.
 */
onModelAfterCreate((e) => {
    const newUser = e.model;
    const BANK_USER_ID = 'z44ierjl0thcczd';
    const BONUS_AMOUNT = 50;

    console.log(`[AUTH_HOOK] New user detected: ${newUser.get("username")} (${newUser.id})`);

    try {
        // check if user has custom name/username
        const username = newUser.get("username") || newUser.get("name") || "Nuevo Usuario";

        // 1. Ensure the user has the initial tokens (the client might have already set them, but let's be sure)
        // If the user already has tokens, we still record the ledger entry for consistency.

        // 2. Create Ledger Record
        const ledgerCollection = $app.dao().findCollectionByNameOrId("ledger");
        const ledgerRecord = new Record(ledgerCollection, {
            from_user: BANK_USER_ID,
            to_user: newUser.id,
            amount: BONUS_AMOUNT,
            type: "REGISTRATION_BONUS",
            description: `Bono de bienvenida para @${username} (automático)`,
            tx_hash: "REGB-" + $security.randomString(10).toUpperCase(),
            entry_type: "CREDIT"
        });

        $app.dao().saveRecord(ledgerRecord);
        console.log(`[AUTH_HOOK] ✅ Registration bonus [${BONUS_AMOUNT} 💎] recorded in ledger for @${username}`);

        // 3. Create Activity Log
        const logCollection = $app.dao().findCollectionByNameOrId("activity_logs");
        const logRecord = new Record(logCollection, {
            user: newUser.id,
            action: "registration_bonus",
            details: JSON.stringify({
                bonus: BONUS_AMOUNT,
                message: "Bono de bienvenida automático"
            })
        });
        $app.dao().saveRecord(logRecord);

    } catch (err) {
        console.error(`[AUTH_HOOK] ❌ Failed to record registration bonus: ${err}`);
    }
}, "users");
