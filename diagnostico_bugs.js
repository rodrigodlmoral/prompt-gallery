import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function diagnosePrompts() {
    try {
        console.log("--- ANALIZANDO UN PROMPT PARA DIAGNÓSTICO ---");
        const prompt = await pb.collection('prompts').getList(1, 1);
        if (prompt.items.length > 0) {
            console.log("Campos encontrados en 'prompts':");
            console.log(Object.keys(prompt.items[0]));
            console.log("\nEjemplo de un objeto Prompt:");
            console.log(JSON.stringify(prompt.items[0], null, 2));
        }

        console.log("\n--- ANALIZANDO PREFERENCIAS DE USUARIO (RODRIGO) ---");
        const user = await pb.collection('users').getOne('rkmrhmgh067x7un'); // ID de Rodrigo
        console.log("Campos de configuración/preferencias en 'users':");
        console.log(Object.keys(user));
        if (user.settings) {
            console.log("Ajustes internos:", user.settings);
        }

    } catch (error) {
        console.error("Error en diagnóstico:", error);
    }
}

diagnosePrompts();
