window.startMigration = async () => {
    const statusEl = document.getElementById('migrateStatus');
    const barEl = document.getElementById('migrateBar');
    const progContainer = document.getElementById('migrateProgress');
    const btn = document.getElementById('btnStartMigrate');

    btn.disabled = true;
    btn.innerText = "⏳ Migrando...";
    progContainer.style.display = 'block';

    let keepGoing = true;
    let sessionIgnored = [];
    let initialCount = -1;
    let totalMigrated = 0;

    while (keepGoing) {
        statusEl.innerText = "🔍 Analizando base de datos...";

        const result = await store.migrateOldImages((current, batchTotal, title, totalPending) => {
            if (initialCount === -1 && totalPending) {
                initialCount = totalPending;
                console.log(`📊 Total a migrar: ${initialCount} posts`);
            }

            let pct = 0;
            if (initialCount > 0) {
                const done = initialCount - totalPending;
                pct = (done / initialCount) * 100;
            }

            statusEl.innerText = `📥 Migrando "${title}"... (Quedan ${totalPending})`;
            barEl.style.width = `${Math.min(pct, 100)}%`;
        }, sessionIgnored);

        if (result.fatal) {
            statusEl.innerText = "❌ Error Crítico: " + result.fatal;
            alert("Error crítico en la migración:\\n" + result.fatal);
            keepGoing = false;
        } else if (result.done || result.totalPending === 0) {
            keepGoing = false;
            statusEl.innerText = "✅ ¡Migración Completada!";
            barEl.style.width = '100%';

            const summary = `✅ Migración Finalizada\\n\\n` +
                `Total migrado: ${totalMigrated + result.count} posts\\n` +
                (sessionIgnored.length > 0 ? `Ignorados (errores): ${sessionIgnored.length}\\n` : '') +
                `\\nTodos tus posts están ahora en Cloudinary.`;

            alert(summary);

            setTimeout(() => {
                window.closeModals();
                window.location.reload();
            }, 1000);
        } else {
            totalMigrated += result.count;

            if (result.failedIds && result.failedIds.length > 0) {
                sessionIgnored = [...sessionIgnored, ...result.failedIds];
                console.warn(`⚠️ ${result.failedIds.length} posts fallaron en este lote`);
            }

            statusEl.innerText = `✅ Lote completado (${result.count} migrados). Continuando...`;
            await new Promise(r => setTimeout(r, 500));
        }
    }

    btn.disabled = false;
    btn.innerText = "🚀 Iniciar Migración";
};
