
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function applyPatch() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        console.log("🔐 Autenticando como Admin...");
        await pb.admins.authWithPassword("rodridom.rock@gmail.com", "alcaline01#pock");
        console.log("✅ Autenticado.");

        // 1. Obtener esquema actual de 'users'
        const usersColl = await pb.collections.getOne('users');
        const hasRewards = usersColl.schema.find(f => f.name === 'total_rewards');

        if (!hasRewards) {
            console.log("🏗️ Añadiendo campo 'total_rewards' a 'users'...");
            usersColl.schema.push({
                name: 'total_rewards',
                type: 'number',
                required: false,
                options: { min: 0 }
            });
            await pb.collections.update('users', usersColl);
            console.log("✅ Campo 'total_rewards' añadido con éxito.");
        } else {
            console.log("ℹ️ El campo 'total_rewards' ya existe.");
        }

        // 2. Configurar reglas de 'ledger'
        const ledgerColl = await pb.collections.getOne('ledger');
        console.log("⚖️ Configurando reglas de 'ledger'...");

        // Permitir crear registros si el destino es el propio usuario
        ledgerColl.createRule = "@request.auth.id != '' && to_user = @request.auth.id";
        // Permitir ver sus propios registros
        ledgerColl.listRule = "from_user = @request.auth.id || to_user = @request.auth.id";
        ledgerColl.viewRule = "from_user = @request.auth.id || to_user = @request.auth.id";

        await pb.collections.update('ledger', ledgerColl);
        console.log("✅ Reglas de 'ledger' actualizadas.");

        // 3. Asegurar que el usuario puede actualizar sus propios campos
        if (!usersColl.updateRule) {
            usersColl.updateRule = "id = @request.auth.id";
            await pb.collections.update('users', usersColl);
            console.log("✅ Regla de actualización de 'users' activada.");
        }

        console.log("\n🚀 ¡PARCHE APLICADO EXITOSAMENTE!");

    } catch (err) {
        console.error("❌ Fallo crítico al aplicar parche:", err);
        if (err.data) console.error("Detalles:", JSON.stringify(err.data, null, 2));
    }
}

applyPatch();
