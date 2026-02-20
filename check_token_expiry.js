
import fs from 'fs';

async function checkExpiry() {
    console.log("⏳ Verificando caducidad del Token...");
    try {
        let token = fs.readFileSync('page_token_raw.txt', 'utf8').replace(/\s/g, '');

        // Consultamos 'debug_token' (requiere un access_token válido para consultar, usaremos el mismo si FB lo permite, 
        // o consultamos /me que a veces trae expires_in implícito o usamos un truco)
        // El endpoint standard es /debug_token?input_token=...&access_token=...
        // Pero intentaremos mirar el campo 'expires_in' en una llamada normal o 'debug_token' usando el mismo token como auth.

        const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`;

        const res = await fetch(url);
        const data = await res.json();

        console.log("--- Token Debug Data ---");
        // console.log(JSON.stringify(data, null, 2)); // Demasiado ruido

        if (data.data) {
            const { expires_at, data_access_expires_at, is_valid, type } = data.data;
            console.log(`Es válido: ${is_valid}`);
            console.log(`Tipo: ${type}`);

            if (expires_at === 0) {
                console.log("📅 Caducidad: NUNCA (Indefinido/Forever) ✅");
            } else {
                const date = new Date(expires_at * 1000);
                console.log(`📅 Caducidad: ${date.toLocaleString()}`);

                // Calcular días restantes
                const daysLeft = Math.ceil((date - Date.now()) / (1000 * 60 * 60 * 24));
                console.log(`⏳ Días restantes: ${daysLeft}`);
            }
        } else if (data.error) {
            console.log("⚠️ No se pudo depurar el token (falta permisos de App?), probando método alternativo...");
            // Método alternativo: /me?fields=id
            // Lamentablemente /me no devuelve 'expires_in' para Page Tokens directamente en el body standard.
            // Asumiremos basado en el tipo si falla el debug.
            console.log("Error:", data.error.message);
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkExpiry();
