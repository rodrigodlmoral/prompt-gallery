import PocketBase from 'pocketbase';
import crypto from 'crypto';

async function finalizeInjection() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        console.log("🔐 Autenticando como Admin...");
        await pb.admins.authWithPassword('rodridom.rock@gmail.com', 'alcaline01#pock');

        console.log("🔍 Verificando estado de rodrigodlmoral...");
        const user = await pb.collection('users').getFirstListItem('name="rodrigodlmoral"');
        console.log(`✅ Usuario: ${user.id} | Balance: ${user.tokens} (Confirmado)`);

        const amount = 500;
        const txHash = crypto.randomBytes(16).toString('hex'); // Formato MD5 hex robusto

        console.log("📝 Registrando entrada en el Ledger...");
        await pb.collection('ledger').create({
            from_user: null, // Sistema / Admin
            to_user: user.id,
            amount: amount,
            type: 'PURCHASE',
            tx_hash: txHash,
            description: `✨ SISTEMA: Inyección administrativa de 500 PromptBits.`,
            metadata: {
                reason: "Inyección Manual Solicitada",
                exec_date: new Date().toISOString(),
                manual_fix: true
            }
        });
        console.log("✅ Registro de Ledger completado exitosamente.");
        console.log(`🔗 Hash de TX: ${txHash}`);

        console.log("\n🚀 ¡PROCESO FINALIZADO CON ÉXITO! @rodrigodlmoral ya tiene sus bits y el registro es oficial.");

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        if (err.data) console.error("Detalle:", JSON.stringify(err.data));
    }
}

finalizeInjection();
