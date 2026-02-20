import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function getIds() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPass);

        const prompts = await pb.collections.getOne('prompts');
        const users = await pb.collections.getOne('users');

        console.log("PROMPTS_ID:", prompts.id);
        console.log("USERS_ID:", users.id);

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

getIds();
