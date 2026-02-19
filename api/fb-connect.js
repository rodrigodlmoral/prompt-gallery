import PocketBase from 'pocketbase';

/**
 * api/fb-connect.js
 * 
 * 1. Receives short-lived User Token from client
 * 2. Exchanges it for Long-Lived User Token (60 days)
 * 3. Fetches list of Pages the user manages
 * 4. Returns list to client for selection
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { shortUserToken } = req.body;

        if (!shortUserToken) {
            return res.status(400).json({ error: 'Missing user token' });
        }

        const APP_ID = '1230045182005480';
        const APP_SECRET = process.env.FB_APP_SECRET;

        if (!APP_SECRET) {
            console.error('[FB_CONNECT] Missing FB_APP_SECRET env var');
            return res.status(500).json({ error: 'Server misconfiguration (Missing App Secret)' });
        }

        // 1. Exchange for Long-Lived User Token
        console.log('[FB_CONNECT] Exchanging for Long-Lived User Token...');
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortUserToken}`;

        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
            console.error('[FB_CONNECT] Exchange Error:', exchangeData.error);
            return res.status(400).json({ error: 'Token exchange failed', details: exchangeData.error.message });
        }

        const longLivedUserToken = exchangeData.access_token;
        console.log('[FB_CONNECT] Got Long-Lived User Token.');

        // 2. Fetch Pages (with their tokens)
        console.log('[FB_CONNECT] Fetching Pages...');
        const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}&limit=100`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData.error) {
            console.error('[FB_CONNECT] Pages Fetch Error:', pagesData.error);
            return res.status(400).json({ error: 'Failed to fetch pages', details: pagesData.error.message });
        }

        // 3. Format response
        const pages = pagesData.data.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            access_token: p.access_token, // This is the Page Token (Long-Lived because User Token was Long-Lived)
            tasks: p.tasks // tasks usually include 'MANAGE', 'CREATE_CONTENT', etc.
        }));

        console.log(`[FB_CONNECT] Found ${pages.length} pages.`);

        return res.status(200).json({ success: true, pages });

    } catch (error) {
        console.error('[FB_CONNECT] Critical Error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
