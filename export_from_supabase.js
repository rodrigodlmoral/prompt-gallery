import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://gaoofpgptjjzxghvjrxw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhb29mcGdwdGpqenhnaHZqcnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTk4ODksImV4cCI6MjA4NTE5NTg4OX0.Z8Y8ajTYWHRRtSuMKo6Kq3B6-S_Y1x1W4vlG7AlS7R4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportData() {
    console.log('🚀 Iniciando exportación desde Supabase...');

    // 1. Exportar Perfiles
    console.log('👥 Exportando perfiles...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error('❌ Error perfiles:', pError);
    else {
        fs.writeFileSync('supabase_profiles.json', JSON.stringify(profiles, null, 2));
        console.log(`✅ ${profiles.length} perfiles guardados.`);
    }

    // 2. Exportar Prompts
    console.log('🖼️ Exportando prompts...');
    const { data: prompts, error: prError } = await supabase.from('prompts').select('*');
    if (prError) console.error('❌ Error prompts:', prError);
    else {
        fs.writeFileSync('supabase_prompts.json', JSON.stringify(prompts, null, 2));
        console.log(`✅ ${prompts.length} prompts guardados.`);
    }

    console.log('🎉 Exportación completada.');
}

exportData();
