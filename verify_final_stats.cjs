const https = require('https');

function check() {
    https.get('https://prompt-gallery.vercel.app/api/economy-stats', (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('=== FINAL ECONOMY STATS ===');
                console.log('Total Emitidos:', data.totalMinted);
                console.log('En Circulación:', data.totalInCirculation);
                console.log('Total Quemados:', data.totalBurned);
                console.log('Discrepancia:', data.discrepancy);
                console.log('\nDesglose por Tipo:');
                Object.entries(data.breakdown).forEach(([k, v]) => console.log(`  ${k}: ${v.total}💎 (${v.count} txs)`));

                console.log('\nTop 10 Holders (Names check):');
                data.topHolders.slice(0, 5).forEach(h => console.log(`  ${h.username}: ${h.tokens}💎`));
            } catch (err) {
                console.error('Error parsing JSON:', err.message);
                console.error('Body was:', body);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching stats:', err.message);
    });
}
check();
