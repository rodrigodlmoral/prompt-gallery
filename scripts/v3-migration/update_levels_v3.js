
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

// V3 MAP (Matching store-final.js exactly)
const V3_LEVELS = [
    {
        level_number: 0,
        posts: 0,
        copies: 0,
        name: 'Explorador',
        benefits: [
            'Welcome Bonus: +50 💎 al registro +50 💎 primer prompt',
            'Acceso completo a galería y filtros',
            'Publicar prompts: 3 diarios máximo',
            'Seguir usuarios y copiar prompts'
        ],
        icon: '🛡️',
        color: '#22c55e'
    },
    {
        level_number: 1,
        posts: 5,
        copies: 0,
        name: 'Novato',
        benefits: [
            'Level Up Bonus: +10 💎',
            'Publicar prompts: 5 diarios máximo',
            'Comentar y guardar favoritos',
            'Enviar/Recibir PromptBits',
            'Destacar posts (coste estándar)'
        ],
        icon: '🌱',
        color: '#3b82f6'
    },
    {
        level_number: 2,
        posts: 25,
        copies: 0,
        name: 'Creador Jr',
        benefits: [
            'Level Up Bonus: +20 💎',
            'Publicar prompts: 10 diarios máximo',
            'Cambiar foto de perfil',
            'Publicar secuencias multi-imagen',
            'Destacar posts (descuento nivel 2)'
        ],
        icon: '🎨',
        color: '#a855f7'
    },
    {
        level_number: 3,
        posts: 50,
        copies: 100,
        name: 'Creador Elite',
        benefits: [
            'Level Up Bonus: +30 💎',
            'Publicar prompts: 20 diarios máximo',
            'Añadir redes sociales y bio',
            'Ultraboost 24hrs (próximamente)',
            'Destacar posts (descuento nivel 3)'
        ],
        icon: '🏆',
        color: '#f97316'
    },
    {
        level_number: 4,
        posts: 100,
        copies: 200,
        name: 'Artista Prompter',
        benefits: [
            'Level Up Bonus: +40 💎',
            'Publicar prompts: 30 diarios máximo',
            'Badge visual destacado',
            'Early access a herramientas',
            'Destacar posts (descuento nivel 4)'
        ],
        icon: '💎',
        color: '#ef4444'
    },
    {
        level_number: 5,
        posts: 250,
        copies: 500,
        name: 'Maestro Prompter',
        benefits: [
            'Level Up Bonus: +50 💎',
            'Publicar prompts: 50 diarios máximo',
            'Programa de Creadores (Monetización)',
            'Perfil Verificado',
            'Analytics Avanzados'
        ],
        icon: '👑',
        color: '#eab308'
    }
];

async function updateLevels() {
    try {
        console.log("🔑 Authenticating...");
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log("✅ Authenticated.");

        console.log("🔄 Updating Levels to V3 Specs...");

        // Fetch existing levels to establish ID mapping
        const existingLevels = await pb.collection('levels').getFullList({ sort: 'level_number' });

        for (const v3Level of V3_LEVELS) {
            // Find matching level by level_number
            const existing = existingLevels.find(l => l.level_number === v3Level.level_number);

            if (existing) {
                console.log(`   🔸 Updating Level ${v3Level.level_number} (${v3Level.name})...`);
                await pb.collection('levels').update(existing.id, {
                    name: v3Level.name,
                    min_posts: v3Level.posts,
                    min_copies: v3Level.copies,
                    icon: v3Level.icon,
                    color: v3Level.color,
                    benefits: v3Level.benefits
                });
            } else {
                console.log(`   ➕ Creating Level ${v3Level.level_number} (${v3Level.name})...`);
                await pb.collection('levels').create({
                    level_number: v3Level.level_number,
                    name: v3Level.name,
                    min_posts: v3Level.posts,
                    min_copies: v3Level.copies,
                    icon: v3Level.icon,
                    color: v3Level.color,
                    benefits: v3Level.benefits
                });
            }
        }

        console.log("✅ All levels updated to V3 V3_Roadmap specs.");

    } catch (err) {
        console.error("❌ Error updating levels:", err);
    }
}

updateLevels();
