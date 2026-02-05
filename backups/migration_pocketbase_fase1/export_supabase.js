import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://gaoofpgptjjzxghvjrxw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhb29mcGdwdGpqenhnaHZqcnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTk4ODksImV4cCI6MjA4NTE5NTg4OX0.Z8Y8ajTYWHRRtSuMKo6Kq3B6-S_Y1x1W4vlG7AlS7R4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportTable(tableName) {
    console.log(`\n📦 [V2] Iniciando exportación: ${tableName}...`);
    let allData = [];
    let from = 0;
    const step = 50; // Bloque más pequeño para evitar timeout
    let hasMore = true;
    let retries = 0;

    while (hasMore) {
        try {
            console.log(`   -> Descargando ${tableName} (${from} - ${from + step})...`);
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .range(from, from + step - 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = allData.concat(data);
                from += data.length;
                if (data.length < step) hasMore = false;
                retries = 0; // Reset retries on success
            }
        } catch (error) {
            console.error(`   ⚠️ Error: ${error.message}.`);
            if (retries < 5) {
                retries++;
                const delay = retries * 2000;
                console.log(`   ⏳ Reintentando en ${delay / 1000}s... (Intento ${retries}/5)`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error(`   ❌ Fallaron todos los reintentos para ${tableName}.`);
                hasMore = false;
            }
        }
    }

    const filePath = path.join(process.cwd(), 'backups', 'migration_pocketbase_fase1', `${tableName}_backup.json`);
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`✅ Finalizado ${tableName}: ${allData.length} filas.`);
}

async function startExport() {
    console.log('🚀 INICIANDO EXPORTACIÓN RESILIENTE');
    await exportTable('profiles');
    await exportTable('prompts');
    await exportTable('activity_logs');
    console.log('\n🌟 FASE 1: PROCESO TERMINADO');
}

startExport();
