import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configurar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const pb = new PocketBase(PB_URL);

async function authenticate() {
    try {
        console.log(`🔌 Conectando a ${PB_URL}...`);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado como Admin.");
    } catch (error) {
        console.error("❌ Error de autenticación. Verifica PB_ADMIN_EMAIL y PB_ADMIN_PASS en .env");
        console.error("Detalle:", error.message);
        process.exit(1);
    }
}

async function ensureSchemaFields() {
    console.log("🔧 Verificando esquema de 'users'...");
    const collection = await pb.collections.getOne('users');

    // PocketBase v0.22+ uses 'fields' instead of 'schema'
    let fields = collection.fields || collection.schema || [];

    let changed = false;

    if (!fields.find(f => f.name === 'total_earned')) {
        console.log("   + Agregando campo 'total_earned'");
        fields.push({
            name: 'total_earned',
            type: 'number',
            required: false,
            options: { min: 0 }
        });
        changed = true;
    }

    if (!fields.find(f => f.name === 'total_spent')) {
        console.log("   + Agregando campo 'total_spent'");
        fields.push({
            name: 'total_spent',
            type: 'number',
            required: false,
            options: { min: 0 }
        });
        changed = true;
    }

    if (changed) {
        // Update functionality depending on PB version
        // Try sending 'fields'
        try {
            await pb.collections.update('users', { fields });
            console.log("✅ Esquema actualizado (usando 'fields').");
        } catch (err) {
            console.log("⚠️ Falló update con 'fields', intentando 'schema' (legacy)...");
            await pb.collections.update('users', { schema: fields });
            console.log("✅ Esquema actualizado (usando 'schema').");
        }
    } else {
        console.log("✅ Esquema ya tiene los campos necesarios.");
    }
}

async function main() {
    console.log("🚀 Iniciando migración de estadísticas de economía...");
    await authenticate();
    await ensureSchemaFields();

    // 1. Fetch all users
    console.log("📥 Obteniendo usuarios...");
    const users = await pb.collection('users').getFullList({ sort: '-created' });
    console.log(`👥 ${users.length} usuarios encontrados.`);

    // 2. Fetch all relevant logs (Pagination handled by getFullList)
    console.log("📥 Obteniendo historial de transacciones (esto puede tardar)...");

    // Tips sent
    let sentLogs = [];
    try {
        sentLogs = await pb.collection('activity_logs').getFullList({
            filter: 'action = "send_tip"'
        });
        console.log(`📤 ${sentLogs.length} propinas enviadas encontradas.`);
    } catch (err) {
        console.error("❌ Error fetching sent_tip logs:", err.originalError || err.message);
        // Dump error to file
        fs.writeFileSync('error_logs_fetch.json', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        throw err;
    }

    // Copy bonuses
    let bonusLogs = [];
    try {
        bonusLogs = await pb.collection('activity_logs').getFullList({
            filter: 'action = "copy_milestone_bonus"'
        });
        console.log(`🏆 ${bonusLogs.length} bonos de copia encontrados.`);
    } catch (err) {
        console.error("❌ Error fetching bonus logs:", err.originalError || err.message);
        throw err;
    }

    // 3. Aggregate stats in memory
    const userStats = {}; // { userId: { earned: 0, spent: 0 } }

    // Init stats for all users
    users.forEach(u => {
        userStats[u.id] = { earned: 0, spent: 0, username: u.username };
    });

    // Process Sent Tips (Spent)
    sentLogs.forEach(log => {
        const userId = log.user;
        const amount = log.details?.amount || 0;
        if (userStats[userId]) {
            userStats[userId].spent += amount;
        }
    });

    // Process Received Tips (Earned)
    // Recipient ID is in details.recipientId (or details.recipient sometimes legacy?)
    sentLogs.forEach(log => {
        const recipientId = log.details?.recipientId || log.details?.recipient;
        // Note: logs sometimes stored 'recipient' as ID, sometimes as username. 
        // Newer logs use 'recipientId'. We try to match IDs.

        let targetId = null;
        if (recipientId && userStats[recipientId]) {
            targetId = recipientId;
        } else if (log.details?.recipient) {
            // Try matching by username if ID failed
            const found = users.find(u => u.username === log.details.recipient || u.id === log.details.recipient);
            if (found) targetId = found.id;
        }

        if (targetId && userStats[targetId]) {
            const amount = log.details?.amount || 0;
            userStats[targetId].earned += amount;
        }
    });

    // Process Bonuses (Earned)
    bonusLogs.forEach(log => {
        const userId = log.user;
        const amount = log.details?.bonus || 0;
        if (userStats[userId]) {
            userStats[userId].earned += amount;
        }
    });

    // 4. Update Users
    console.log("💾 Actualizando registros de usuario...");
    let updatedCount = 0;

    // Process in chunks to avoid overwhelming server
    const chunks = [];
    const CHUNK_SIZE = 10;
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
        chunks.push(users.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (u) => {
            const stats = userStats[u.id];

            // Only update if changed (or force update to ensure fields exist)
            const currentEarned = u.total_earned || 0;
            const currentSpent = u.total_spent || 0;

            if (stats.earned !== currentEarned || stats.spent !== currentSpent) {
                try {
                    await pb.collection('users').update(u.id, {
                        total_earned: stats.earned,
                        total_spent: stats.spent
                    });
                    console.log(`   ✅ @${stats.username}: Earned ${stats.earned} | Spent ${stats.spent}`);
                    updatedCount++;
                } catch (err) {
                    console.error(`   ❌ Error actualizando @${stats.username}:`, err.message);
                }
            }
        }));
    }

    console.log(`\n🏁 Migración completada. ${updatedCount} usuarios actualizados.`);
}

main().catch(err => {
    console.error("FATAL ERROR:", err);
    fs.writeFileSync('error_fatal.txt', err.toString() + "\n" + (err.stack || ""));
});
