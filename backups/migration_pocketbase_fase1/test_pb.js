import fetch from 'node-fetch';

async function check() {
    try {
        const res = await fetch('https://prompt-gallery.pockethost.io/api/health');
        console.log('Status PocketHost:', res.status);
    } catch (e) {
        console.log('Error de red:', e.message);
    }
}
check();
