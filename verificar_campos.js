import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function checkSchema() {
    try {
        console.log("--- SCHEMA USERS ---");
        const user = await pb.collection('users').getFirstListItem("");
        console.log("Campos disponibles en 'users':");
        console.log(Object.keys(user));
        console.log("Valores de ejemplo:");
        console.log(user);
    } catch (err) {
        console.error("Error:", err);
    }
}

checkSchema();
