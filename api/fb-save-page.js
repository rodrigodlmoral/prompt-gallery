import PocketBase from 'pocketbase';

/**
 * api/fb-save-page.js
 * 
 * 1. Receives Page ID, Name, and Page Access Token
 * 2. Validates token by calling /me endpoint of the page
 * 3. Authenticates as Admin to PocketBase
 * 4. Saves/Updates the single 'active' record in 'fb_settings'
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const steps = []; // Diagnostic breadcrumbs

    try {
        const { pageId, pageName, pageAccessToken, userId } = req.body;
        steps.push(`Received: pageId=${pageId}, pageName=${pageName}, userId=${userId}, tokenLen=${pageAccessToken?.length}`);

        if (!pageId || !pageAccessToken) {
            return res.status(400).json({ error: 'Missing page details' });
        }

        // Step 1: Validate Token with FB
        steps.push('Step 1: Validating token with Facebook...');
        const debugUrl = `https://graph.facebook.com/me?access_token=${pageAccessToken}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();

        if (debugData.error || debugData.id !== pageId) {
            steps.push(`Step 1 FAILED: ${JSON.stringify(debugData.error || { mismatch: debugData.id })}`);
            return res.status(400).json({
                error: 'Invalid Page Token',
                details: debugData.error?.message,
                steps
            });
        }
        steps.push(`Step 1 OK: Token valid for "${debugData.name}" (${debugData.id})`);

        // Step 2: Connect to PocketBase as Admin
        const pbUrl = process.env.PB_URL || process.env.VITE_POCKETBASE_URL;
        const email = process.env.PB_ADMIN_EMAIL;
        const pass = process.env.PB_ADMIN_PASS;
        steps.push(`Step 2: Connecting to PB at ${pbUrl ? pbUrl.substring(0, 30) + '...' : 'UNDEFINED'}`);

        if (!pbUrl || !email || !pass) {
            return res.status(500).json({
                error: `Server misconfiguration: PB_URL=${!!pbUrl}, EMAIL=${!!email}, PASS=${!!pass}`,
                steps
            });
        }

        const pb = new PocketBase(pbUrl);

        try {
            await pb.admins.authWithPassword(email, pass);
            steps.push('Step 2 OK: Admin authenticated');
        } catch (authErr) {
            steps.push(`Step 2 FAILED: Auth error: ${authErr.message}`);
            return res.status(500).json({ error: 'PB Admin Auth failed: ' + authErr.message, steps });
        }

        // Step 3: Check for existing active settings
        steps.push('Step 3: Checking existing settings...');
        let existing;
        try {
            existing = await pb.collection('fb_settings').getList(1, 1, {
                filter: 'status="active"',
                sort: '-created'
            });
            steps.push(`Step 3 OK: Found ${existing.items.length} existing active settings`);
        } catch (listErr) {
            steps.push(`Step 3 FAILED: List error: ${listErr.message} | Data: ${JSON.stringify(listErr.data || {})}`);
            return res.status(500).json({ error: 'List settings failed: ' + listErr.message, steps });
        }

        // Step 4: Save new setting
        steps.push('Step 4: Preparing record data...');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 59);

        const recordData = {
            page_id: pageId,
            page_name: pageName,
            access_token: pageAccessToken,
            status: 'active',
            expires_at: expiresAt.toISOString(),
        };

        // Only add connected_by if userId is a valid string
        if (userId && typeof userId === 'string' && userId.length > 5) {
            recordData.connected_by = userId;
        }

        steps.push(`Step 4: Record data keys: ${Object.keys(recordData).join(', ')}`);

        let savedRecord;

        // Step 5: Archive old + Create new
        try {
            if (existing && existing.items.length > 0) {
                const oldId = existing.items[0].id;
                steps.push(`Step 5a: Archiving old setting ${oldId}...`);
                await pb.collection('fb_settings').update(oldId, { status: 'expired' });
                steps.push('Step 5a OK: Old setting archived');
            }

            steps.push('Step 5b: Creating new setting...');
            savedRecord = await pb.collection('fb_settings').create(recordData);
            steps.push(`Step 5b OK: Created record ${savedRecord.id}`);
        } catch (saveErr) {
            // Extract detailed PocketBase validation errors
            const pbData = saveErr.data || {};
            const fieldErrors = Object.entries(pbData)
                .filter(([k]) => k !== 'message' && k !== 'code')
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join('; ');

            steps.push(`Step 5 FAILED: ${saveErr.message} | Status: ${saveErr.status} | Fields: ${fieldErrors || 'none'}`);
            return res.status(500).json({
                error: `Save failed: ${saveErr.message}${fieldErrors ? ' | ' + fieldErrors : ''}`,
                pbStatus: saveErr.status,
                pbData: pbData,
                steps
            });
        }

        return res.status(200).json({ success: true, id: savedRecord.id, steps });

    } catch (error) {
        steps.push(`UNHANDLED: ${error.message}`);
        return res.status(500).json({
            error: 'Save Error: ' + error.message,
            message: error.message,
            steps
        });
    }
}
