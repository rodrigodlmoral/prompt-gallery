
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function inspect() {
    const targetUserId = "1fmcah0igjzburh";
    console.log("🔍 INSPECCIONANDO USUARIO:", targetUserId);

    try {
        const user = await pb.collection('users').getOne(targetUserId);
        console.log("✅ Usuario encontrado (Full Record):");
        console.log(JSON.stringify(user, null, 2));

        console.log("\n🔍 CALCULANDO SALDO REAL DESDE PROMPTS...");
        const prompts = await pb.collection('prompts').getFullList({
            filter: `author = "${targetUserId}"`
        });

        const totalTokens = prompts.reduce((sum, p) => sum + (p.tokens_received || 0), 0);
        console.log(`📈 Saldo total calculado (suma de tokens_received): ${totalTokens}`);
        console.log(`📉 Saldo en el registro del usuario (tokens): ${user.tokens || 0}`);
        console.log(`📉 Saldo en el registro del usuario (tokens_received): ${user.tokens_received || 0}`);

    } catch (err) {
        console.log("❌ Error:", err.message);
    }
}

inspect();
