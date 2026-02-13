const PocketBase = require('pocketbase/cjs');
const fs = require('fs');

// Configuración
const PB_URL = 'https://prompt-gallery.pockethost.io/';
const ADMIN_ID = 'rkmrhmgh067x7un'; // ID de Usuario Admin (De historial previo)

async function exportFollowers() {
    console.log("🚀 Iniciando exportación de seguidores para: " + ADMIN_ID);
    const pb = new PocketBase(PB_URL);

    try {
        // Cargar variables de entorno
        require('dotenv').config();

        const email = process.env.PB_ADMIN_EMAIL || 'rodrigodlmoral@gmail.com';
        const pass = process.env.PB_ADMIN_PASS || 'Lmrl_112022';

        if (!email || !pass) throw new Error("Faltan credenciales de admin (PB_ADMIN_EMAIL/PASS) en .env");

        await pb.admins.authWithPassword(email, pass);
        console.log("✅ Autenticado como Admin Global");

        // 1. Obtener el usuario admin para ver su lista de IDs de seguidores
        const adminUser = await pb.collection('users').getOne(ADMIN_ID);
        const followerIds = adminUser.followers || [];
        console.log(`📊 Total de IDs en lista 'followers': ${followerIds.length}`);

        if (followerIds.length === 0) {
            console.log("⚠️ No tienes seguidores para exportar.");
            return;
        }

        // 2. Obtener los detalles (Emails) de esos usuarios
        // PocketBase permite filtrar por lista de IDs: id = 'A' || id = 'B' ...
        // Pero si son muchos, es mejor paginar o usar filter
        // Haremos lotes de 50 para evitar url too long
        console.log("📥 Descargando detalles (Emails)...");

        let emails = [];
        const CHUNK_SIZE = 50;

        for (let i = 0; i < followerIds.length; i += CHUNK_SIZE) {
            const chunk = followerIds.slice(i, i + CHUNK_SIZE);
            // Construir filtro safely
            const filter = chunk.map(id => `id="${id}"`).join("||");

            const records = await pb.collection('users').getFullList({
                filter: filter,
                fields: 'email, name, username'
            });

            records.forEach(r => {
                if (r.email) emails.push({ email: r.email, name: r.name || r.username || 'Subscriber' });
            });
            process.stdout.write(`.`);
        }
        console.log("\n");

        // 3. Guardar CSV (Formato compatible con Zoho Campaigns / Mailchimp)
        const csvContent = "Email,First Name\n" + emails.map(e => `${e.email},"${e.name}"`).join("\n");
        const filename = `followers_export_${Date.now()}.csv`;

        fs.writeFileSync(filename, csvContent);
        console.log(`✅ EXPORTACIÓN COMPLETADA`);
        console.log(`📂 Archivo: ${filename}`);
        console.log(`📧 Contactos: ${emails.length}`);
        console.log(`\n👉 Siguiente paso: Importar este CSV en Zoho Campaigns.`);

    } catch (err) {
        console.error("❌ Error fatal:", err.message);
    }
}

exportFollowers();
