
import fs from 'fs';

const PAGE_ID = "963667040166127";

async function verify() {
    console.log("📂 Leyendo Token desde archivo...");
    try {
        let rawToken = fs.readFileSync('page_token_raw.txt', 'utf8');

        // LIMPIEZA AGRESIVA: Eliminar CUALQUIER espacio en blanco (incluyendo saltos de línea internos)
        const token = rawToken.replace(/\s/g, '');

        console.log(`Original Length: ${rawToken.length}`);
        console.log(`Cleaned Length: ${token.length}`);

        // 1. Verificar identidad ('me')
        const url = `https://graph.facebook.com/me?access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("--- Identity Check ---");
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));

        if (data.id === PAGE_ID) {
            console.log("✅ ES EL TOKEN CORRECTO PARA LA PÁGINA.");
            console.log("--- TOKEN LIMPIO Y VALIDADO PARA COPIAR ---");
            console.log(token);
            console.log("-------------------------------------------");
        } else {
            console.log("❌ ERROR O ID INCORRECTO");
        }

    } catch (e) {
        console.error("Error crítico:", e.message);
    }
}

verify();
