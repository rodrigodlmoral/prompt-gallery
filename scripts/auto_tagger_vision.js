import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PocketBase from 'pocketbase';
import { TAG_CATEGORIES } from '../src/data/tags.js';

// Configuration
const PB_URL = process.env.VITE_POCKETBASE_URL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
    console.error("❌ Error: GEMINI_API_KEY no configurada en .env");
    process.exit(1);
}

const pb = new PocketBase(PB_URL);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
// This API Key has access to futuristic models
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

// Flatten all available tags for the AI to choose from
const ALL_AVAILABLE_TAGS = Object.values(TAG_CATEGORIES).flat();

// Helper for delay (Safe & Slow)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function autoTag() {
    try {
        console.log("🚀 Iniciando Auto-Tagger (Modo SEGURO y LENTO)...");

        // --- AUTH AS ADMIN (Superuser) ---
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPass = process.env.PB_ADMIN_PASS;
        if (adminEmail && adminPass) {
            console.log("🔑 Autenticando como Superuser (v0.22+)...");
            await pb.collection('_superusers').authWithPassword(adminEmail, adminPass);
            console.log("✅ Autenticación exitosa.");
        }

        // 1. Get prompts using getList
        const res = await pb.collection('prompts').getList(1, 100);
        const allRecords = res.items;

        // Filter for records with NO tags
        const records = allRecords.filter(r => !r.tags || (Array.isArray(r.tags) && r.tags.length === 0));

        console.log(`🔎 Encontrados ${records.length} posts sin etiquetas (de ${allRecords.length} totales).`);

        for (const record of records) {
            console.log(`\n📦 Procesando: "${record.title}" (${record.id})`);

            // Safe & Slow: 5 seconds delay to protect connection
            await sleep(5000);

            try {
                // 2. Fetch image (Support native PB files and Cloudinary URLs)
                let imageUrl = record.image;
                if (!imageUrl) {
                    console.log("⚠️ Registro sin imagen. Saltando...");
                    continue;
                }

                if (!imageUrl.startsWith('http')) {
                    imageUrl = `${PB_URL}/api/files/prompts/${record.id}/${imageUrl}`;
                }

                console.log(`🔗 Descargando: ${imageUrl}`);
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    console.error(`❌ Error al descargar (${response.status}): ${response.statusText}`);
                    continue;
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Image = buffer.toString('base64');

                // 3. Prompt Gemini (with Retry logic for 429)
                const promptTemplate = `
                    Analiza esta imagen y selecciona las etiquetas más adecuadas de la siguiente lista oficial.
                    Devuelve ÚNICAMENTE un array JSON de strings con máximo 5 etiquetas.
                    
                    LISTA OFICIAL:
                    ${ALL_AVAILABLE_TAGS.join(', ')}
                    
                    IMPORTANTE: No inventes etiquetas. Solo usa las de la lista oficial proporcionada.
                `;

                let geminiRes;
                let attempts = 0;
                while (attempts < 3) {
                    try {
                        geminiRes = await model.generateContent([
                            promptTemplate,
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: "image/webp"
                                }
                            }
                        ]);
                        break; // Success
                    } catch (err) {
                        if (err.status === 429) {
                            console.log("⚠️ Quota excedida (429). Esperando 60s para reintentar...");
                            await sleep(60000);
                            attempts++;
                        } else {
                            throw err; // Re-throw other errors
                        }
                    }
                }

                if (!geminiRes) {
                    console.log(`❌ No se pudo obtener resultado de Gemini después de ${attempts} intentos.`);
                    continue;
                }

                const aiText = geminiRes.response.text();
                // Extract JSON array
                const jsonMatch = aiText.match(/\[.*\]/s);
                if (jsonMatch) {
                    const tags = JSON.parse(jsonMatch[0]);
                    const validTags = tags.filter(t => ALL_AVAILABLE_TAGS.includes(t)).slice(0, 5);

                    if (validTags.length > 0) {
                        console.log(`✅ IA sugirió: ${validTags.join(', ')}`);
                        // 4. Update PocketBase
                        await pb.collection('prompts').update(record.id, {
                            tags: validTags
                        });
                        console.log("💾 Base de datos actualizada con éxito.");
                    } else {
                        console.log("⚠️ La IA no sugirió etiquetas válidas.");
                    }
                }

            } catch (err) {
                console.error(`❌ Fallo en post ${record.id}:`, err);
            }
        }

        console.log("\n✨ ¡Proceso de auto-tagging finalizado con éxito!");

    } catch (error) {
        console.error("❌ Error General del Proceso:", error);
    }
}

autoTag();
