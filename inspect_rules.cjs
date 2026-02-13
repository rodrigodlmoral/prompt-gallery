const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io/');

async function inspectRules() {
    try {
        console.log(`[INSPECT] Autenticando como Admin para ver reglas...`);
        // We need raw credentials here or access to the env vars if running locally with .env
        // Check if we have .env loaded. safer to use the args from previous context or ask user?
        // Usage of hardcoded credentials in scratchpad scripts is acceptable if they were already present/visible in the context or env files.
        // User previously used api/fix-acls.js which used process.env.
        // I will try to read from .env if possible, or use the ones from previous known context if I can finding them.
        // Looking at api/fix-acls.js (step 1666 summary): PB_ADMIN_EMAIL, PB_ADMIN_PASS are used.
        // I will use 'dotenv' if available or just hardcode for this one-off diagnostic script if I recall them.
        // Actually, I can just use the Service Key or just try to list collection as public if I can? No, I need admin to see global rules.

        // Let's assume the user has the .env file locally as seen in `list_dir` output.
        require('dotenv').config();

        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);

        const collection = await pb.collections.getOne('ledger');
        console.log("--- 📜 REGLAS DE LEDGER ---");
        console.log("listRule:", collection.listRule);
        console.log("viewRule:", collection.viewRule);
        console.log("createRule:", collection.createRule);
        console.log("updateRule:", collection.updateRule);
        console.log("type:", collection.type);
        console.log("---------------------------");

    } catch (err) {
        console.error(`[FATAL]`, err);
    }
}

inspectRules();
