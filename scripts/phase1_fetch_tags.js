import 'dotenv/config';
import PocketBase from 'pocketbase';
import fs from 'fs';
import { TAG_CATEGORIES } from '../src/data/tags.js';

// Configuration
const PB_URL = process.env.VITE_POCKETBASE_URL;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const CACHE_FILE = './scripts/tags_cache.json';

if (!OPENROUTER_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY no configurada en .env");
    process.exit(1);
}

const pb = new PocketBase(PB_URL);
const ALL_AVAILABLE_TAGS = Object.values(TAG_CATEGORIES).flat();

// Load existing cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function phase1_fetchTags() {
    try {
        console.log("🚀 Iniciando Fase 1: Extracción de Tags con OpenRouter...");

        const res = await pb.collection('prompts').getList(1, 100);
        const records = res.items.filter(r => !r.tags || r.tags.length === 0);

        console.log(`🔎 Encontrados ${records.length} posts sin etiquetas.`);

        for (const record of records) {
            // Skip if already in cache
            if (cache[record.id]) {
                console.log(`⏭️  ${record.id} ya está en caché. Saltando...`);
                continue;
            }

            console.log(`\n📦 Procesando: "${record.title}" (${record.id})`);

            // OpenRouter free tier usually allows 20-50 RPM, so 3s is safe
            await sleep(3000);

            try {
                let imageUrl = record.image;
                if (!imageUrl) continue;
                if (!imageUrl.startsWith('http')) {
                    imageUrl = `${PB_URL}/api/files/prompts/${record.id}/${imageUrl}`;
                }

                console.log(`🔗 Analizando: ${imageUrl}`);

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": "google/gemini-2.0-flash-lite-001",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": `Selecciona las etiquetas más adecuadas de esta lista oficial: ${ALL_AVAILABLE_TAGS.join(', ')}. Devuelve ÚNICAMENTE un array JSON de strings con máximo 5 etiquetas.`
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": { "url": imageUrl }
                                    }
                                ]
                            }
                        ]
                    })
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
                }

                if (!data.choices || data.choices.length === 0) {
                    throw new Error(`OpenRouter no devolvió opciones: ${JSON.stringify(data)}`);
                }

                const aiText = data.choices[0].message.content;

                const match = aiText.match(/\[.*\]/s);
                if (match) {
                    const tags = JSON.parse(match[0]);
                    const filteredTags = tags.filter(t => ALL_AVAILABLE_TAGS.includes(t)).slice(0, 5);

                    if (filteredTags.length > 0) {
                        console.log(`✅ IA sugirió: ${filteredTags.join(', ')}`);
                        // Update cache
                        cache[record.id] = {
                            title: record.title,
                            tags: filteredTags,
                            timestamp: new Date().toISOString()
                        };
                        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
                    }
                }

            } catch (err) {
                console.error(`❌ Error en post ${record.id}:`, err.message);
            }
        }

        console.log("\n✨ Fase 1 finalizada. Tags guardados en scripts/tags_cache.json");

    } catch (error) {
        console.error("❌ Error General Fase 1:", error);
    }
}

phase1_fetchTags();
