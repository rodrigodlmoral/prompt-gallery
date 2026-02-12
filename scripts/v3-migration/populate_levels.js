
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PB_URL = process.env.VITE_POCKETBASE_URL || "https://prompt-gallery.pockethost.io";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PB_ADMIN_PASS;

const pb = new PocketBase(PB_URL);

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

async function main() {
    await authenticate();

    console.log("📥 Inyectando niveles...");

    // Clear existing to avoid duplicates if run multiple times
    const existing = await pb.collection('levels').getFullList();
    for (const item of existing) {
        await pb.collection('levels').delete(item.id);
    }

    for (const lvl of INITIAL_LEVELS) {
        try {
            await pb.collection('levels').create(lvl);
            console.log(`+ Nivel ${lvl.level_number}: ${lvl.name}`);
        } catch (e) {
            console.error(`❌ Error nivel ${lvl.level_number}:`, e.data || e.message);
        }
    }
    console.log("✅ Niveles populados.");
}

main();
