import 'dotenv/config';
import PocketBase from 'pocketbase';

async function testUpdate() {
    const pb = new PocketBase(process.env.VITE_POCKETBASE_URL);
    const id = 'v4lakbpx12lerae';
    try {
        console.log(`Intentando actualizar tags para ${id}...`);
        const res = await pb.collection('prompts').update(id, {
            tags: ['test_tag']
        });
        console.log("Respuesta de update:", JSON.stringify(res.tags));

        const fresh = await pb.collection('prompts').getOne(id);
        console.log("Verificación inmediata:", JSON.stringify(fresh.tags));
    } catch (e) {
        console.error("❌ Error en update:", e.status, e.message);
    }
}
testUpdate();
