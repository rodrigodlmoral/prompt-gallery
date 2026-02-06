
/* SCRIPT DE RECUPERACIÓN FINAL (DATOS INTEGRADOS) */
(async () => {
    let token = "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('pb_auth') || key.includes('auth')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.token) { token = data.token; break; }
            } catch(e) {}
        }
    }
    if (!token) return console.error('❌ Error: No se encontró sesión admin. Refresca la página.');

    const baseUrl = 'https://prompt-gallery.pockethost.io/api/collections';
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };
    
    // DATOS INYECTADOS
    const backupData = [{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837658/pg_1769837658457_7bcd5bvla.png","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837660/pg_1769837661122_l21vpi3et.png","r":"NSFW / +18","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837667/pg_1769837667999_x7w3k6739.png","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837674/pg_1769837674813_1ayufxoxy.png","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837675/pg_1769837675955_oq8o9tuqj.png","r":"Sugestivo","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837681/pg_1769837681891_4aipxy4lg.jpg","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837693/pg_1769837693751_dz7ot7itv.webp","r":"NSFW / +18","b":0,"p":false},{"img":"","r":null,"b":0,"p":true},{"img":"","r":null,"b":0,"p":true},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837698/pg_1769837698989_qi051pad1.webp","r":"NSFW / +18","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837694/pg_1769837694901_cpu5t1sdm.png","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837703/pg_1769837703705_duegneqse.webp","r":"SFW / Apto","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837701/pg_1769837702434_mu53n2212.webp","r":"NSFW / +18","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837687/pg_1769837687523_rck8msce9.webp","r":"SFW / Apto","b":0,"p":true},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837672/pg_1769837673078_e6kjflt08.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769880133/pg_1769880130879_xhaaggk7k.webp","r":"SFW / Apto","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837700/pg_1769837701342_x8l1d8oyy.webp","r":"NSFW / +18","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769974303/pg_1769974303866_f4h9td9ez.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770117160/pg_1770117158475_0jg0tn9gg.png","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770108713/pg_1770108712045_2khexx7w5.png","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770071212/pg_1770071212240_hdh0em6ka.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770169372/pg_1770169370570_yngffeee6.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770056246/pg_1770056245533_hp05umoxv.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770051053/pg_1770051050664_tljml5om1.webp","r":"Sugestivo","b":30,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770186269/pg_1770186266995_1dmkin7s5.webp","r":"Sugestivo","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770230156/pg_1770230156530_mnq58jqwc.webp","r":"Sugestivo","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770186628/pg_1770186627215_v6469vvwz.webp","r":"Sugestivo","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770186747/pg_1770186746090_5mpyw2twj.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187346/pg_1770187345252_0570osd3u.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187215/pg_1770187214608_a20af7dxx.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187120/pg_1770187119652_soq8y9mcq.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187010/pg_1770187009480_lkjkkjrgv.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770186905/pg_1770186903984_trrlofst0.webp","r":"Sugestivo","b":0,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187431/pg_1770187430494_pun1jhewp.webp","r":"Sugestivo","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770186468/pg_1770186467066_lxvwg3llu.webp","r":"Sugestivo","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770192391/pg_1770192391566_wa8ojymwp.webp","r":"SFW / Apto","b":25,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770194653/pg_1770194652690_usjo31oah.webp","r":"SFW / Apto","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770197365/pg_1770197365360_icx8dj7l0.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1769837682/pg_1769837682944_s9t7vwscl.jpg","r":"SFW / Apto","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187808/pg_1770187807348_w5b66cwl0.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770187731/pg_1770187730249_iyqxyg90h.webp","r":"SFW / Apto","b":5,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770239087/pg_1770239086935_s2x71jqcr.webp","r":"SFW / Apto","b":10,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770239426/pg_1770239426233_snskmioim.webp","r":"SFW / Apto","b":25,"p":false},{"img":"https://res.cloudinary.com/du0oasfjl/image/upload/f_auto,q_auto/v1770238794/pg_1770238794718_v863awqwy.webp","r":"SFW / Apto","b":55,"p":false}];

    console.log("%c🚀 Iniciando restauración de propinas, ratings y privacidad...", "color: #3498db; font-weight: bold;");

    let page = 1;
    let totalUpdated = 0;

    while(true) {
        const res = await fetch(`${baseUrl}/prompts/records?page=${page}&perPage=50`, { headers });
        const data = await res.json();
        if (!data.items || data.items.length === 0) break;

        for (const item of data.items) {
            const imgStr = (item.image || '').trim();
            const hist = backupData.find(b => b.img === imgStr);
            
            if (hist) {
                const updateBody = {};
                
                // 1. Restaurar Propinas (si en PB está en cero)
                if (hist.b > 0 && (item.tokens_received === 0 || !item.tokens_received)) {
                    updateBody.tokens_received = hist.b;
                }
                
                // 2. Restaurar Rating (si en PB es SFW por defecto)
                if (hist.r && hist.r !== 'SFW / Apto' && (!item.rating || item.rating === 'SFW / Apto')) {
                    updateBody.rating = hist.r;
                }

                // 3. Restaurar Privacidad
                if (hist.p === true && item.is_private !== true) {
                    updateBody.is_private = true;
                }

                if (Object.keys(updateBody).length > 0) {
                    const patchRes = await fetch(`${baseUrl}/prompts/records/${item.id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(updateBody)
                    });
                    
                    if (patchRes.ok) {
                        totalUpdated++;
                        console.log(`✅ [${totalUpdated}] Restaurado: "${item.title}" | Rating: ${updateBody.rating || '-'} | Bits: ${updateBody.tokens_received || '-'}`);
                    }
                }
            }
        }
        if (data.items.length < 50) break;
        page++;
    }

    console.log(`%c✨ PROCESO FINALIZADO. ${totalUpdated} posts recuperados con sus datos originales.`, "color: #2ecc71; font-weight: bold;");
    console.log("Ya puedes refrescar la web para ver los cambios.");
})();
