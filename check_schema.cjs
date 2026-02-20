
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkSchema() {
    try {
        // Obtenemos una lista de usuarios para ver sus campos
        const users = await pb.collection('users').getList(1, 1);
        if (users.items.length > 0) {
            console.log("=== CAMPOS EN COLECCIÓN 'users' ===");
            console.log(Object.keys(users.items[0]));
        } else {
            console.log("No hay usuarios para inspeccionar.");
        }

        const ledger = await pb.collection('ledger').getList(1, 1);
        if (ledger.items.length > 0) {
            console.log("\n=== CAMPOS EN COLECCIÓN 'ledger' ===");
            console.log(Object.keys(ledger.items[0]));
        }

    } catch (err) {
        console.error("Schema check failed:", err);
    }
}

checkSchema();
