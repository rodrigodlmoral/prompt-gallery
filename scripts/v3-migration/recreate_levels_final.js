
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const pb = new PocketBase(PB_URL);

// --- INITIAL LEVEL DATA ---
const INITIAL_LEVELS = [
    { level_number: 0, name: 'Explorador', min_posts: 0, min_copies: 0, icon: '🛡️', color: '#888888', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'] },
    { level_number: 1, name: 'Novato', min_posts: 10, min_copies: 0, icon: '🌱', color: '#4caf50', benefits: ['Publicar Secuencias (Multi-imagen)'] },
    { level_number: 2, name: 'Creador Jr', min_posts: 25, min_copies: 0, icon: '🎨', color: '#2196f3', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'] },
    { level_number: 3, name: 'Creador', min_posts: 50, min_copies: 15, icon: '🏆', color: '#ff9800', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'] },
    { level_number: 4, name: 'Artista', min_posts: 100, min_copies: 40, icon: '💎', color: '#9c27b0', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'] },
    { level_number: 5, name: 'Maestro', min_posts: 250, min_copies: 80, icon: '👑', color: '#ffd700', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'] }
];

async function authenticate() {
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Autenticado.");
    } catch (error) {
        console.error("❌ Auth Error:", error.message);
        process.exit(1);
    }
}

async function recreateCollection(name, fields, rules = {}) {
    try {
        try {
            const col = await pb.collections.getOne(name);
            console.log(`🗑️ Eliminando colección '${name}'...`);
            await pb.collections.delete(col.id);
        } catch (e) { /* Ignore */ }

        console.log(`🏗️ Creando colección '${name}'...`);

        await pb.collections.create({
            name: name,
            type: 'base',
            fields: fields,
            ...rules
        });
        console.log(`✅ Colección '${name}' creada.`);
        return true;
    } catch (e) {
        const errorData = e.data || e.message;
        console.error(`❌ Error creando '${name}':`, JSON.stringify(errorData, null, 2));
        throw e;
    }
}

async function main() {
    await authenticate();

    // LEVELS (FLATT)
    const levelsFields = [
        { name: 'level_number', type: 'number', required: true, min: 0 },
        { name: 'name', type: 'text', required: true },
        { name: 'min_posts', type: 'number', required: false, min: 0 },
        { name: 'min_copies', type: 'number', required: false, min: 0 },
        { name: 'icon', type: 'text', required: false },
        { name: 'color', type: 'text', required: false },
        { name: 'benefits', type: 'json', required: false }
    ];

    await recreateCollection('levels', levelsFields, {
        listRule: "",
        viewRule: ""
    });

    // POPULATE LEVELS
    console.log("📥 Inyectando niveles...");
    for (const lvl of INITIAL_LEVELS) {
        try {
            await pb.collection('levels').create(lvl);
            process.stdout.write(`+`);
        } catch (e) {
            console.error(`\n❌ Error lvl ${lvl.level_number}:`, JSON.stringify(e.data || e.message));
        }
    }
    console.log("\n✅ Listo.");
}

main().catch(() => { });
