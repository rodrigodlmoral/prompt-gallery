import fs from 'fs';

const stream = fs.createReadStream('supabase_profiles.json', { encoding: 'utf8' });
let data = '';

stream.on('data', (chunk) => {
    data += chunk;
    if (data.includes('rodridom.rock@gmail.com')) {
        const start = data.lastIndexOf('{', data.indexOf('rodridom.rock@gmail.com'));
        const end = data.indexOf('}', data.indexOf('rodridom.rock@gmail.com')) + 1;
        if (start !== -1 && end !== -1) {
            console.log(data.substring(start, end));
            stream.destroy();
        }
    }
    // Mantener solo los últimos 1MB para evitar sobrepasar memoria
    if (data.length > 1024 * 1024) {
        data = data.substring(data.length - 1024 * 1024);
    }
});

stream.on('end', () => console.log('Not found'));
