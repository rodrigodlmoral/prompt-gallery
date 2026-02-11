
import { pb } from './src/pocketbase.js';

async function diagnose() {
    console.log("🔍 Iniciando Diagnóstico de smangel97...");
    try {
        const username = "smangel97";
        // Buscamos posts que digan smangel97 en algún lado pero cuyo autor no sepamos quién es
        const prompts = await pb.collection('prompts').getFullList({
            filter: `author_name = "${username}" || title ~ "${username}"`,
            limit: 5
        });

        console.log(`✅ Encontrados ${prompts.length} posts potenciales.`);
        if (prompts.length > 0) {
            console.log("📝 Campos del primer registro:", JSON.stringify(Object.keys(prompts[0])));
            console.log("👤 Autor ID actual en el post:", prompts[0].author);
            console.log("👤 Nombre de Autor guardado:", prompts[0].author_name);
        } else {
            console.log("❌ No se encontró nada con author_name='smangel97'. Buscando por contenido...");
            const brute = await pb.collection('prompts').getList(1, 50);
            const found = brute.items.filter(p => JSON.stringify(p).includes(username));
            console.log(`🔎 Búsqueda bruta: Encontrados ${found.length} menciones.`);
        }
    } catch (err) {
        console.error("❌ Error en diagnóstico:", err);
    }
}

diagnose();
