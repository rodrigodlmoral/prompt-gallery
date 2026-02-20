import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

const adminEmail = 'rodridom.rock@gmail.com';
const adminPass = 'alcaline01#pock';

async function checkUsersSchema() {
    try {
        await pb.admins.authWithPassword(adminEmail, adminPass);
        const c = await pb.collections.getOne('users');
        console.log("USER FIELDS:", c.fields.map(f => f.name));
    } catch (err) {
        console.error(err.message);
    }
}

checkUsersSchema();
