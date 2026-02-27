const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://prompt-gallery.pockethost.io';

async function main() {
    const email = 'rodridom.rock@gmail.com';
    const pass = 'alcaline01#pock';

    const pb = new PocketBase(PB_URL);
    await pb.admins.authWithPassword(email, pass);

    let usersCollId = "_pb_users_auth_";
    let promptsCollId = "prompts";
    try {
        const u = await pb.collections.getOne('users');
        usersCollId = u.id;
        const p = await pb.collections.getOne('prompts');
        promptsCollId = p.id;
        console.log("Resolved IDs: users=" + usersCollId + ", prompts=" + promptsCollId);
    } catch (e) {
        console.error("Failed to resolve relation IDs:", e.message);
        return;
    }

    // 1. Create boosts collection using v0.22 fields format
    const boostsSchema = {
        name: 'boosts',
        type: 'base',
        system: false,
        fields: [
            { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: usersCollId },
            { name: "prompt", type: "relation", required: true, maxSelect: 1, collectionId: promptsCollId },
            { name: "type", type: "text", required: true },
            { name: "price_paid", type: "number", required: true },
            { name: "purchased_at", type: "date", required: true },
            { name: "expires_at", type: "date", required: true },
            { name: "is_active", type: "bool" },
            { name: "views_count", type: "number" },
            { name: "clicks_count", type: "number" },
            { name: "notified_expiring", type: "bool" }
        ],
        listRule: "user = @request.auth.id",
        viewRule: "user = @request.auth.id",
        createRule: "@request.auth.id != \"\"",
        updateRule: "user = @request.auth.id",
        deleteRule: null // Users shouldn't delete boosts
    };

    try {
        await pb.collections.create(boostsSchema);
        console.log("✅ Collection 'boosts' created successfully");
    } catch (e) {
        console.log("⚠️ Error creating 'boosts'. See err.json");
        require('fs').writeFileSync('err.json', JSON.stringify(e.data || e, null, 2));
    }

    // 2. We need collection ID to make a relation, so let's get it:
    let boostsCollId;
    try {
        const c = await pb.collections.getOne('boosts');
        boostsCollId = c.id;
    } catch (e) {
        console.error("Failed to fetch boosts collection ID. Cannot create boost_notifications properly.");
        return;
    }

    // 3. Create boost_notifications collection
    const notifSchema = {
        name: 'boost_notifications',
        type: 'base',
        system: false,
        fields: [
            { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: usersCollId },
            { name: "boost", type: "relation", required: true, maxSelect: 1, collectionId: boostsCollId },
            { name: "type", type: "text", required: true },
            { name: "message", type: "text", required: true },
            { name: "is_read", type: "bool" },
            { name: "action_url", type: "text" }
        ],
        listRule: "user = @request.auth.id",
        viewRule: "user = @request.auth.id",
        createRule: "@request.auth.id != \"\"",
        updateRule: "user = @request.auth.id",
        deleteRule: "user = @request.auth.id"
    };

    try {
        await pb.collections.create(notifSchema);
        console.log("✅ Collection 'boost_notifications' created successfully");
    } catch (e) {
        console.log("⚠️ Error creating 'boost_notifications':", e.data?.message || e.message);
    }
}

main().catch(console.error);
