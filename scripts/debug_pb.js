import 'dotenv/config';
import PocketBase from 'pocketbase';

async function test() {
    console.log("URL:", process.env.VITE_POCKETBASE_URL);
    const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
    try {
        console.log("Intentando listar prompts...");
        const res = await pb.collection('prompts').getList(1, 1);
        console.log("✅ Éxito! Encontrados:", res.totalItems);
        const item = res.items[0];
        console.log("Primer item:", item?.title);
        console.log("Campo 'image' del primer item:", item?.image);

        console.log("\nProbando inicialización de Gemini 1.5 Flash...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Modelo 'gemini-1.5-flash' instanciado correctamente.");
    } catch (e) {
        console.error("❌ Error:", e.status || 'N/A', e.message);
        if (e.data) console.error("Data:", JSON.stringify(e.data));
    }
}
test();
