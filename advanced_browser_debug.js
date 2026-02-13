(async () => {
    console.clear();
    console.log("🐛 DIAGNÓSTICO DE FILTROS (MODO AVANZADO) 🐛");

    // 1. Recuperar Instancia o Crear Nueva
    let pb = window.pb || (window.stores && window.stores.pb);

    if (!pb) {
        console.log("⚠️ No se encontró instancia global 'pb'. Intentando crear una nueva...");
        try {
            const PocketBase = window.PocketBase || (await import('https://unpkg.com/pocketbase/dist/pocketbase.es.mjs')).default;
            pb = new PocketBase('https://prompt-gallery.pockethost.io');
        } catch (e) {
            return console.error("❌ No se pudo cargar la librería PocketBase.", e);
        }
    }

    // 2. Recuperar Token de LocalStorage
    console.log("🔑 Buscando token en LocalStorage...");
    const rawAuth = localStorage.getItem('pocketbase_auth');
    if (rawAuth) {
        pb.authStore.loadFromCookie(rawAuth); // o loadFromStorage, pero la cookie string es el formato usual
        // Si es JSON puro, loadFromCookie falla, probamos save
        try {
            const parsed = JSON.parse(rawAuth);
            if (parsed.token && parsed.model) {
                pb.authStore.save(parsed.token, parsed.model);
            }
        } catch (e) { }
    }

    const uid = pb?.authStore?.model?.id;
    const token = pb?.authStore?.token;

    if (!uid || !token) {
        console.error("❌ ERROR CRÍTICO: No se pudo recuperar la sesión del usuario.");
        console.log("LocalStorage 'pocketbase_auth':", rawAuth);
        return;
    }

    console.log("✅ Usuario Autenticado:", uid);
    console.log("✅ Token:", token.substring(0, 10) + "...");

    // 3. Pruebas de Filtro
    const tests = [
        { name: "1. Comillas Dobles (from_user=\"ID\")", filter: `from_user="${uid}" || to_user="${uid}"` },
        { name: "2. Comillas Simples (from_user='ID')", filter: `from_user='${uid}' || to_user='${uid}'` },
        { name: "3. Sin Espacios (from_user=\"ID\"...)", filter: `from_user="${uid}"||to_user="${uid}"` },
        { name: "4. Solo from_user", filter: `from_user="${uid}"` },
        { name: "5. Sin Filtro (Control)", filter: "" }
    ];

    for (const t of tests) {
        console.group(`🧪 Prueba: ${t.name}`);
        console.log(`Filtro: [${t.filter}]`);
        try {
            // Usamos una petición nueva para asegurar limpieza
            const res = await fetch(`https://prompt-gallery.pockethost.io/api/collections/ledger/records?page=1&perPage=1&filter=${encodeURIComponent(t.filter)}&sort=-created`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`✅ ÉXITO (${res.status}). Items: ${data.totalItems}`);
            } else {
                const errJson = await res.json().catch(() => ({}));
                console.error(`❌ FALLO (${res.status}):`, errJson.message || res.statusText, errJson);
            }
        } catch (e) {
            console.error("❌ ERROR DE RED:", e.message);
        }
        console.groupEnd();
    }
    console.log("🏁 Diagnóstico Finalizado");
})();
