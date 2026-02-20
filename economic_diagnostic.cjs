
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompts-gallery.pockethost.io');

async function diagnostic() {
    try {
        // Obtenemos el usuario por su username (basado en el contexto anterior)
        // El usuario parece ser el admin o el usuario con el que estamos probando
        const user = await pb.collection('users').getFirstListItem('username="rodrigodlmoral"', {
            fields: 'id,username,tokens,total_earned,total_rewards,level'
        });

        console.log("=== DIAGNÓSTICO USUARIO ===");
        console.log(JSON.stringify(user, null, 2));

        console.log("\n=== ÚLTIMAS TRANSACCIONES LEDGER ===");
        const ledger = await pb.collection('ledger').getList(1, 5, {
            filter: `to_user = "${user.id}"`,
            sort: '-created'
        });
        console.log(JSON.stringify(ledger.items, null, 2));

        console.log("\n=== ÚLTIMOS LOGS DE ACTIVIDAD ===");
        const logs = await pb.collection('activity_logs').getList(1, 5, {
            filter: `user = "${user.id}"`,
            sort: '-created'
        });
        console.log(JSON.stringify(logs.items, null, 2));

    } catch (err) {
        console.error("Diagnostic failed:", err);
    }
}

diagnostic();
