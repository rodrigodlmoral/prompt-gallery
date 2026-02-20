
import PocketBase from 'pocketbase';
import 'dotenv/config';

async function applyPatch() {
    const pb = new PocketBase('https://prompt-gallery.pockethost.io');

    try {
        console.log("🔐 Autenticando como Admin...");
        const adminEmail = process.env.PB_ADMIN_EMAIL?.replace(/"/g, '');
        const adminPass = process.env.PB_ADMIN_PASS?.replace(/"/g, '');

        await pb.admins.authWithPassword(adminEmail, adminPass);
        console.log("✅ Autenticado.");

        // 1. Flexibilizar 'ledger'.from_user (quitar mandated/required)
        console.log("📋 Cargando colección 'ledger'...");
        const ledgerColl = await pb.collections.getOne('ledger');

        const fromField = ledgerColl.fields.find(f => f.name === 'from_user');
        if (fromField && fromField.required) {
            console.log("🔓 Haciendo 'from_user' opcional en 'ledger'...");
            fromField.required = false;
            // En v0.22.x actualizamos enviando el objeto completo
            await pb.collections.update(ledgerColl.id, ledgerColl);
            console.log("✅ Campo 'from_user' ahora es opcional.");
        } else {
            console.log("ℹ️ El campo 'from_user' ya es opcional o no existe.");
        }

        // 2. Asegurar que los tipos de recompensa están en el select (por si acaso)
        const typeField = ledgerColl.fields.find(f => f.name === 'type');
        if (typeField && typeField.options) {
            const missing = ['POST_REWARD', 'LEVEL_UP'].filter(t => !typeField.options.values.includes(t));
            if (missing.length > 0) {
                console.log("🏗️ Añadiendo tipos faltantes al select:", missing);
                typeField.options.values.push(...missing);
                await pb.collections.update(ledgerColl.id, ledgerColl);
            }
        }

        console.log("\n🚀 ¡BASE DE DATOS OPTIMIZADA EXITOSAMENTE!");

    } catch (err) {
        console.error("❌ Fallo crítico al aplicar parche:", err.message);
        if (err.data) console.error("Detalles:", JSON.stringify(err.data, null, 2));
        process.exit(1);
    }
}

applyPatch();
