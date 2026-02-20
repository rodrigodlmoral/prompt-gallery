const PocketBase = require('./node_modules/pocketbase/cjs/index.js');
const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
    try {
        const full = await pb.collection('prompts').getFullList({
            $autoCancel: false
        });
        console.log("ABS_TOTAL_COUNT:", full.length);

        const authors = {};
        full.forEach(p => {
            const auth = p.author || 'unknown';
            if (!authors[auth]) authors[auth] = { public: 0, private: 0 };
            const isPrivate = p.is_private === true || p.isPrivate === true;
            if (isPrivate) authors[auth].private++;
            else authors[auth].public++;
        });

        console.log("AUTHORS_SUMMARY:", JSON.stringify(authors, null, 2));

        const publicCount = full.filter(p => !(p.is_private === true || p.isPrivate === true)).length;
        console.log("TOTAL_PUBLIC:", publicCount);

    } catch (e) {
        console.error("FAIL:", e.message);
    }
}
check();
