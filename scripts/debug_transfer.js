
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
dotenv.config();

// Config
const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

console.log("Debug URL:", PB_URL);

async function run() {
    const pbAdmin = new PocketBase(PB_URL);

    try {
        // 1. Authenticate as Admin to create users
        console.log("👮 (Setup) Authenticating as Admin to create test users...");
        await pbAdmin.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        // 2. Create User A (Sender) and User B (Recipient) if not exist
        const usernameA = "test_sender_" + Math.random().toString(36).substring(7);
        const usernameB = "test_recipient_" + Math.random().toString(36).substring(7);

        console.log("👤 Creating User A (Sender)...");
        const userA = await pbAdmin.collection('users').create({
            username: usernameA,
            email: `${usernameA}@example.com`,
            password: "password123",
            passwordConfirm: "password123",
            name: "Sender A",
            tokens: 100, // Initial balance
            total_spent: 0
        });
        console.log("   User A created:", userA.id);

        console.log("👤 Creating User B (Recipient)...");
        const userB = await pbAdmin.collection('users').create({
            username: usernameB,
            email: `${usernameB}@example.com`,
            password: "password123",
            passwordConfirm: "password123",
            name: "Recipient B",
            tokens: 0,
            total_earned: 0
        });
        console.log("   User B created:", userB.id);

        // 3. Login as User A
        console.log("\n🔄 Testing Server Endpoint /api/economy/transfer...");
        const pbClient = new PocketBase(PB_URL);
        console.log("🔑 Logging in as User A...");
        await pbClient.collection('users').authWithPassword(`${usernameA}@example.com`, "password123");
        const token = pbClient.authStore.token;
        console.log("   Logged in. Token:", token.substring(0, 15) + "...");

        const amount = 10;

        try {
            console.log(`💸 Sending request to /api/economy/transfer (Param Mode + Token)...`);

            const params = new URLSearchParams({
                recipientId: userB.id,
                amount: amount.toString(),
                type: 'debug_test_param',
                token: token
            });

            console.log("URL:", '/api/economy/transfer?' + params.toString());

            // Note: We leave body empty as we use query params
            const result = await pbClient.send('/api/economy/transfer?' + params.toString(), {
                method: 'POST',
                body: {}
            });
            console.log("✅ API Success!", result);
        } catch (apiErr) {
            console.error("❌ API Failed!");
            console.error("Status:", apiErr.status);
            console.error("Message:", apiErr.message);
            if (apiErr.response) {
                console.error("Response:", apiErr.response);
            }
        }

        // Cleanup
        console.log("\n🧹 Cleanup...");
        await pbAdmin.collection('users').delete(userA.id);
        await pbAdmin.collection('users').delete(userB.id);
        console.log("Done.");

    } catch (err) {
        console.error("🔥 Fatal Error:", err);
    }
}

run();
