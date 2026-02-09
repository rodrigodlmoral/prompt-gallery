import 'dotenv/config';
import PocketBase from 'pocketbase';

async function inspect() {
    const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
    try {
        console.log("Obteniendo información de la colección 'prompts'...");
        // List collections
        const collections = await pb.collections.getFullList();
        const promptsColl = collections.find(c => c.name === 'prompts');
        if (promptsColl) {
            console.log("✅ Colección 'prompts' encontrada.");
            console.log("Campos:", promptsColl.schema.map(f => `${f.name} (${f.type})`).join(', '));
        } else {
            console.log("❌ Colección 'prompts' no encontrada en la lista.");
        }
    } catch (e) {
        console.error("❌ Error:", e.status, e.message);
    }
}
inspect();
