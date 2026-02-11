
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function triggerSync() {
    const userId = "1fmcah0igjzburh";
    console.log("🔄 DISPARANDO SINCRONIZACIÓN MANUAL PARA ID:", userId);

    try {
        const user = await pb.collection('users').getOne(userId);

        // 1. Contar posts reales
        const stats = await pb.collection('prompts').getList(1, 1, {
            filter: `author = "${userId}"`,
            fields: 'id'
        });
        const realPosts = stats.totalItems || 0;

        // 2. Calcular copias totales y tokens (PromptBits) recibidos reales
        const allPrompts = await pb.collection('prompts').getFullList({
            filter: `author = "${userId}"`,
            fields: 'copy_count,tokens_received'
        });
        const realCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);
        const realTokens = allPrompts.reduce((sum, p) => sum + (p.tokens_received || 0), 0);

        console.log(`📊 Calculado: Posts=${realPosts}, Copias=${realCopies}, Tokens=${realTokens}`);
        console.log(`📉 Actual en DB: Posts=${user.prompts_count}, Copias=${user.total_copies}, Tokens=${user.tokens}`);

        if (user.tokens !== realTokens || user.prompts_count !== realPosts || user.total_copies !== realCopies) {
            console.log("🚀 Actualizando base de datos...");
            await pb.collection('users').update(userId, {
                prompts_count: realPosts,
                total_copies: realCopies,
                tokens: realTokens
            });
            console.log("✅ Sincronización completada.");
        } else {
            console.log("⚖️ El saldo ya estaba sincronizado.");
        }

    } catch (err) {
        console.log("❌ Error:", err.message);
    }
}

triggerSync();
