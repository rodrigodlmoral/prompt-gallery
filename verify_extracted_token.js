
const PAGE_TOKEN = "EAANZAV9IRnzwBQhxRtZCZAfMaC9EwXeqMaVu3X3MfGGB1JFLTnygpHd23cAYQ1oIq6oHlQxrWyx5aE85HpcS9MgDmDLMpzn3OhCvwHWKRkKs4FUZCxBe3HHesZAIg9gzpCaMu8x";
const PAGE_ID = "963667040166127";

async function verifyPageToken() {
    console.log("🔍 Verificando Token de Página Extraído...");
    console.log(`Token Length: ${PAGE_TOKEN.length}`);

    try {
        // 1. Verificar identidad ('me')
        const url = `https://graph.facebook.com/me?access_token=${PAGE_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("--- Identity Check ---");
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));

        if (data.id === PAGE_ID) {
            console.log("✅ ES EL TOKEN CORRECTO PARA LA PÁGINA.");
        } else if (data.error) {
            console.log("❌ ERROR API:", data.error.message);
            console.log("Code:", data.error.code);
            console.log("Subcode:", data.error.error_subcode);
        } else {
            console.log("⚠️ ID NO COINCIDE (¿Es otra página?)");
        }

        // 2. Verificar permisos ('permissions')
        /*
        const permUrl = `https://graph.facebook.com/me/permissions?access_token=${PAGE_TOKEN}`;
        const permRes = await fetch(permUrl);
        const permData = await permRes.json();
        console.log("--- Permissions Check ---");
        if (permData.data) {
            permData.data.forEach(p => console.log(`- ${p.permission}: ${p.status}`));
        } else {
            console.log("No permission data:", permData);
        }
        */

    } catch (e) {
        console.error("Error crítico:", e.message);
    }
}

verifyPageToken();
