import 'dotenv/config';
import PocketBase from 'pocketbase';

async function testAuth() {
    const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
    const email = process.env.PB_ADMIN_EMAIL;
    const pass = process.env.PB_ADMIN_PASS;

    console.log(`Probando credenciales para: ${email}`);

    try {
        console.log("\nIntentando como Superuser (_superusers)...");
        await pb.collection('_superusers').authWithPassword(email, pass);
        console.log("✅ Éxito como Superuser!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Falló como Superuser:", e.status, e.message);
    }

    try {
        console.log("\nIntentando como Usuario Regular (users)...");
        await pb.collection('users').authWithPassword(email, pass);
        console.log("✅ Éxito como Usuario Regular!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Falló como Usuario Regular:", e.status, e.message);
    }
}
testAuth();
