import PocketBase from 'pocketbase';

async function inject() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        console.log("🔐 Autenticando...");
        await pb.admins.authWithPassword('rodridom.rock@gmail.com', 'alcaline01#pock');

        console.log("🔍 Buscando usuario: rodrigodlmoral");
        const user = await pb.collection('users').getFirstListItem('name="rodrigodlmoral"');
        console.log(`✅ Usuario encontrado: ${user.id} | Balance actual: ${user.tokens}`);

        const amount = 500;
        const newTokens = (user.tokens || 0) + amount;
        const newEarned = (user.total_earned || 0) + amount;
        const newRewards = (user.total_rewards || 0) + amount;

        console.log(`🚀 Inyectando ${amount} bits...`);

        // 1. Actualizar Usuario
        await pb.collection('users').update(user.id, {
            tokens: newTokens,
            total_earned: newEarned,
            total_rewards: newRewards
        });
        console.log("✅ Balance actualizado en PocketBase.");

        // 2. Registrar en Ledger
        await pb.collection('ledger').create({
            from_user: null, // Sistema
            to_user: user.id,
            amount: amount,
            type: 'REWARD',
            metadata: {
                reason: "Inyección Administrativa Solicitada",
                exec_date: new Date().toISOString()
            }
        });
        console.log("✅ Transacción registrada en el Ledger.");

        console.log(`\n💎 RESULTADO FINAL: ${newTokens} PromptBits`);

    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err.message);
        if (err.data) console.error("Detalle:", JSON.stringify(err.data));
        process.exit(1);
    }
}

inject();
