import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Standard model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        console.log("Probando generación de texto simple con 'gemini-1.5-flash'...");
        const result = await model.generateContent("Hola, ¿estás funcionando?");
        console.log("✅ Respuesta:", result.response.text());
    } catch (e) {
        console.error("❌ Error con 'gemini-1.5-flash':", e.status || e.message);

        console.log("\nIntentando con 'models/gemini-1.5-flash'...");
        try {
            const model2 = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
            const result2 = await model2.generateContent("Hola, ¿estás funcionando?");
            console.log("✅ Respuesta:", result2.response.text());
        } catch (e2) {
            console.error("❌ Error con 'models/gemini-1.5-flash':", e2.status || e2.message);
        }
    }
}
test();
