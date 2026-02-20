
import fs from 'fs';
import fetch from 'node-fetch';

const PAGE_ID = "963667040166127";

async function verify() {
    console.log("📂 Leyendo Token desde archivo...");
    try {
        let token = fs.readFileSync('page_token_raw.txt', 'utf8');
        // LIMPIEZA CRÍTICA: Eliminar espacios y saltos de línea que FS pueda leer
        token = token.trim();

        console.log(`Token Length: ${token.length}`);
        console.log(`Token Start: ${token.substring(0, 10)}...`);
        console.log(`Token End: ...${token.substring(token.length - 10)}`);

        // 1. Verificar identidad ('me')
        const url = `https://graph.facebook.com/me?access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("--- Identity Check ---");
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));

        if (data.id === PAGE_ID) {
            console.log("✅ ES EL TOKEN CORRECTO PARA LA PÁGINA.");
            // Si es correcto, lo imprimimos limpio para que yo pueda dárselo al usuario
            console.log("--- TOKEN LIMPIO PARA COPIAR ---");
            console.log(token);
            console.log("--------------------------------");
        } else {
            console.log("❌ ERROR O ID INCORRECTO");
        }

    } catch (e) {
        console.error("Error crítico:", e.message);
    }
}

verify();
