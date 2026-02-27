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

    console.log("--- INICIANDO EXPORTACIÓN DE USUARIOS (SOLO CON SALDO > 0) ---");

    const users = await pb.collection('users').getFullList({
        filter: 'tokens > 0',
        fields: 'id,username,name,tokens'
    });

    const prompts = await pb.collection('prompts').getFullList({
        fields: 'author'
    });

    const promptCounts = {};
    prompts.forEach(p => {
        if (!p.author) return;
        promptCounts[p.author] = (promptCounts[p.author] || 0) + 1;
    });

    const exportData = users.map(u => ({
        id: u.id,
        username: u.username || u.name || 'Sin nombre',
        tokens: u.tokens || 0,
        prompts: promptCounts[u.id] || 0
    }));

    exportData.sort((a, b) => b.tokens - a.tokens);

    let md = "# Exportación de Usuarios con Saldo Positivo\n\n";
    md += "| # | Usuario | ID | Saldo (💎) | Prompts Shared |\n";
    md += "|---|---------|----|-----------|----------------|\n";

    exportData.forEach((u, index) => {
        md += `| ${index + 1} | @${u.username} | \`${u.id}\` | **${u.tokens.toLocaleString()}** | ${u.prompts} |\n`;
    });

    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'solo_usuarios_con_saldo.md');
    fs.writeFileSync(outputPath, md);

    console.log(`--- EXPORTACIÓN FINALIZADA (${exportData.length} usuarios con saldo) ---`);
    console.log(`Archivo generado: ${outputPath}`);
}

run();
