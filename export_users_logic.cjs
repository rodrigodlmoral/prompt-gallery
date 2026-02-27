const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function run() {
    const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'https://prompt-gallery.pockethost.io';
    const pb = new PocketBase(PB_URL);

    try {
        await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    } catch (e) {
        await pb.collection('_superusers').authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASS);
    }

    console.log("--- INICIANDO EXPORTACIÓN DE USUARIOS ---");

    const users = await pb.collection('users').getFullList({
        fields: 'id,username,name,tokens'
    });

    const prompts = await pb.collection('prompts').getFullList({
        fields: 'author'
    });

    // Contar prompts por usuario
    const promptCounts = {};
    prompts.forEach(p => {
        if (!p.author) return;
        promptCounts[p.author] = (promptCounts[p.author] || 0) + 1;
    });

    // Combinar datos
    const exportData = users.map(u => ({
        id: u.id,
        username: u.username || u.name || 'Sin nombre',
        tokens: u.tokens || 0,
        prompts: promptCounts[u.id] || 0
    }));

    // Ordenar por tokens (descendente)
    exportData.sort((a, b) => b.tokens - a.tokens);

    // Generar Markdown para el informe
    let md = "# Exportación de Usuarios (Estructura de Riqueza)\n\n";
    md += "| # | Usuario | ID | Saldo (💎) | Prompts Shared |\n";
    md += "|---|---------|----|-----------|----------------|\n";

    exportData.forEach((u, index) => {
        md += `| ${index + 1} | @${u.username} | \`${u.id}\` | **${u.tokens.toLocaleString()}** | ${u.prompts} |\n`;
    });

    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'export_usuarios_tokens.md');
    fs.writeFileSync(outputPath, md);

    console.log(`--- EXPORTACIÓN FINALIZADA (${exportData.length} usuarios) ---`);
    console.log(`Archivo generado: ${outputPath}`);
}

run();
