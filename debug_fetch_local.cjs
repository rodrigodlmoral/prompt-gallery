
require('dotenv').config();

async function debugFetchLocal() {
    const pbUrl = (process.env.VITE_POCKETBASE_URL || '').replace(/\/$/, '');
    const email = process.env.PB_ADMIN_EMAIL.replace(/"/g, '');
    const pass = process.env.PB_ADMIN_PASS.replace(/"/g, '');

    console.log('Target:', pbUrl);

    // 1. Auth (_superusers)
    console.log('Auth...');
    const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password: pass })
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
        console.error('Auth Failed:', authRes.status, authData);
        return;
    }
    const adminToken = authData.token;
    console.log('Auth OK. Token len:', adminToken.length);

    // 2. List (fetch) WITH BEARER
    console.log('Listing with Bearer...');
    const listQuery = new URLSearchParams({
        page: '1',
        perPage: '10',
        sort: '-created'
    });

    const listUrl = `${pbUrl}/api/collections/fb_settings/records?${listQuery.toString()}`;

    const listRes = await fetch(listUrl, {
        headers: {
            'Authorization': `Bearer ${adminToken}` // TRYING BEARER
        }
    });

    if (!listRes.ok) {
        console.error('List (Bearer) Failed:', listRes.status);
        const txt = await listRes.text();
        console.error('Body:', txt);

        // Retry WITHOUT Bearer but maybe with different headers?
        console.log('Retrying without Bearer...');
        const listRes2 = await fetch(listUrl, {
            headers: {
                'Authorization': adminToken
            }
        });
        if (!listRes2.ok) {
            console.error('List (Raw) Failed Again:', listRes2.status);
            console.error('Body:', await listRes2.text());
        } else {
            console.log('List (Raw) OK!');
        }

    } else {
        const data = await listRes.json();
        console.log('List (Bearer) OK. Items:', data.items?.length);
    }
}

debugFetchLocal();
