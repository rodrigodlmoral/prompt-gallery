/**
 * api/fb-save-page.js
 * 
 * STANDARD FETCH IMPLEMENTATION (SDK BYPASS)
 * To rule out any SDK version/environment incompatibilities.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const steps = [];

    try {
        const { pageId, pageName, pageAccessToken, userId } = req.body;
        steps.push(`Received: pageId=${pageId}, tokenLen=${pageAccessToken?.length}`);

        if (!pageId || !pageAccessToken) {
            return res.status(400).json({ error: 'Missing page details' });
        }

        // --- Step 1: FB Validation ---
        steps.push('Step 1: Validating token with Facebook...');
        const fbRes = await fetch(`https://graph.facebook.com/me?access_token=${pageAccessToken}`);
        const fbData = await fbRes.json();
        if (fbData.error || fbData.id !== pageId) {
            steps.push(`Step 1 FAILED: ${JSON.stringify(fbData.error || { mismatch: fbData.id })}`);
            return res.status(400).json({ error: 'FB Token Invalid', steps });
        }
        steps.push(`Step 1 OK: Token valid (${fbData.id})`);

        // --- Step 2: PB Auth (Raw Fetch) ---
        const pbUrl = (process.env.PB_URL || process.env.VITE_POCKETBASE_URL || '').replace(/\/$/, ''); // Remove trailing slash
        const email = process.env.PB_ADMIN_EMAIL;
        const pass = process.env.PB_ADMIN_PASS;

        steps.push(`Step 2: Connecting to PB (fetch) at ${pbUrl}...`);

        if (!pbUrl || !email || !pass) {
            return res.status(500).json({ error: 'Missing PB Envs', steps });
        }

        // PocketBase v0.23+ uses _superusers collection instead of /api/admins
        const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: email, password: pass })
        });

        const authData = await authRes.json();

        if (!authRes.ok || !authData.token) {
            steps.push(`Step 2 FAILED: ${authRes.status} | ${JSON.stringify(authData)}`);
            return res.status(500).json({ error: 'PB Auth Failed', steps });
        }

        const adminToken = authData.token;
        steps.push('Step 2 OK: Got Admin Token');

        // --- Step 3: Check Existing (Raw Fetch) ---
        steps.push('Step 3: Checking existing settings...');
        const listQuery = new URLSearchParams({
            page: '1',
            perPage: '10'
            // sort: '-created' // CAUSES 400 ERROR IN PB v0.23+
        });

        const listRes = await fetch(`${pbUrl}/api/collections/fb_settings/records?${listQuery.toString()}`, {
            headers: {
                'Authorization': adminToken
            }
        });

        if (!listRes.ok) {
            const errText = await listRes.text();
            steps.push(`Step 3 FAILED: ${listRes.status} | RESPONSE: ${errText.substring(0, 200)}`);
            return res.status(500).json({ error: 'List Failed', steps });
        }

        const listData = await listRes.json(); // Expected: { items: [...] }
        steps.push(`Step 3 OK: Fetched ${listData.items?.length} items`);

        // Filter active
        const existingActive = (listData.items || []).find(i => i.status === 'active');

        // --- Step 4: Prepare Data ---
        steps.push('Step 4: Preparing data...');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 59);

        const recordData = {
            page_id: pageId,
            page_name: pageName,
            access_token: pageAccessToken,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            // connected_by: userId (skip to be safe unless needed)
            debug_info: { source: 'api_v4.6.8_raw_fetch' }
        };
        if (userId && typeof userId === 'string') recordData.connected_by = userId;

        // --- Step 5: Save (Archive Old + Create New) ---
        if (existingActive) {
            steps.push(`Step 5a: Archiving ${existingActive.id}...`);
            await fetch(`${pbUrl}/api/collections/fb_settings/records/${existingActive.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ status: 'expired' })
            });
            steps.push('Step 5a OK');
        }

        steps.push('Step 5b: Creating new...');
        const createRes = await fetch(`${pbUrl}/api/collections/fb_settings/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminToken
            },
            body: JSON.stringify(recordData)
        });

        if (!createRes.ok) {
            const createErr = await createRes.json();
            steps.push(`Step 5b FAILED: ${createRes.status} | ${JSON.stringify(createErr)}`);
            return res.status(500).json({ error: 'Create Failed', steps });
        }

        const createdItem = await createRes.json();
        steps.push(`Step 5b OK: Created ${createdItem.id}`);

        return res.status(200).json({ success: true, id: createdItem.id, steps });

    } catch (e) {
        steps.push(`CRITICAL EXCEPTION: ${e.message}`);
        return res.status(500).json({ error: 'Exception: ' + e.message, steps });
    }
}
