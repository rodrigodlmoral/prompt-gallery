
const USER_TOKEN = "EAANZAV9IRnzwBQpxQ6ZAjCXNlQohZAAKkMN2wnKfAq5ZCuJne2GnfvQAzlgCzFZA3s9K9bHOZCzusbiDZBjoYc6SQCkXpqSHOZCFTgjQ0PeWgmCuo7HVxmX3ZCVEFK8o4aD7166VZCi9nnSvIZAY2UJu3WYNIqND5zkDTZA3AIaKUB38pzEGSCTg6QFAkURoyyZAEySzh";
const TARGET_PAGE_ID = "963667040166127";

async function getPageToken() {
    console.log("🔄 Intentando canjear User Token por Page Token...");
    try {
        // 1. Obtener las cuentas (páginas) del usuario
        const url = `https://graph.facebook.com/me/accounts?access_token=${USER_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error("❌ Error API:", data.error.message);
            return;
        }

        console.log(`✅ Cuentas encontradas: ${data.data.length}`);

        // 2. Buscar la página correcta
        const page = data.data.find(p => p.id === TARGET_PAGE_ID);

        if (page) {
            console.log("🎉 ¡PÁGINA ENCONTRADA!");
            console.log(`Nombre: ${page.name}`);
            console.log(`ID: ${page.id}`);
            console.log("🔑 TU TOKEN DE PÁGINA ES:");
            console.log("🔑 TU TOKEN DE PÁGINA SE HA GUARDADO EN 'page_token_raw.txt'");

            // Guardar en archivo para evitar errores de copia/consola
            const fs = await import('fs');
            fs.writeFileSync('page_token_raw.txt', page.access_token, 'utf8');

            // Verificación extra
            await verifyPageToken(page.access_token);
        } else {
            console.error("❌ No encontré la página con ID " + TARGET_PAGE_ID + " en tus cuentas.");
            console.log("Páginas disponibles:", data.data.map(p => `${p.name} (${p.id})`).join(", "));
        }

    } catch (e) {
        console.error("Error crítico:", e.message);
    }
}

async function verifyPageToken(token) {
    console.log("🔍 Verificando el nuevo Token...");
    const url = `https://graph.facebook.com/me?access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Soy: ${data.name} (ID: ${data.id})`);
    if (data.id === TARGET_PAGE_ID) {
        console.log("✅ CONFIRMADO: Este es un Token de PÁGINA real.");
    }
}

getPageToken();
