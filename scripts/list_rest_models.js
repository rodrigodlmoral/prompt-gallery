import 'dotenv/config';

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log("Consultando lista de modelos vía REST...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Error de la API:", data.error.message);
            return;
        }

        console.log("✅ Modelos disponibles:");
        for (const m of data.models) {
            console.log(`- ${m.name}`);
            console.log(`  MÉTODOS: ${m.supportedGenerationMethods.join(', ')}`);
        }
    } catch (e) {
        console.error("❌ Error en la petición:", e.message);
    }
}
listModels();
