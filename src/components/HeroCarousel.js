import { store } from '../store-final.js';
import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const HeroCarousel = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    // === FEATURED PROMPTS: THREE TYPES ===
    const all = [...prompts].filter(p => !p.isPrivate);

    // Calculate engagement score function
    function calculateEngagementScore(p) {
        const reactions = Object.values(p.reactions || {}).reduce((sum, val) => sum + val, 0);
        const comments = (p.comments || []).length;
        const copies = (p.saved_by || []).length;
        const tips = p.tokens_received || 0;
        return reactions + comments + copies + tips;
    }

    // 1. ADMIN-FEATURED (permanent, manually marked by admin)
    const adminFeatured = all.filter(p => p.admin_featured === true);

    // 2. USER-BOOSTED (paid 50 tokens, 1 week duration)
    const userBoosted = all.filter(p => {
        if (!p.is_featured || !p.featured_until) return false;
        return new Date(p.featured_until) > new Date();
    });

    // 3. ORGANIC TOP 12 (by engagement score)
    const organicCandidates = all
        .filter(p => !p.admin_featured && (!p.is_featured || new Date(p.featured_until) <= new Date()))
        .map(p => ({ ...p, engagementScore: calculateEngagementScore(p) }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 12);

    // Combine all three types
    const featured = [...adminFeatured, ...userBoosted, ...organicCandidates];
    if (featured.length === 0) return '';

    // Duplicate for infinite scroll if needed
    const list = featured.length < 6 ? featured : featured.concat(featured);

    return `
    <div class="container" style = "margin-top:20px; margin-bottom:-10px">
        <h2 style="font-size:1.2rem; font-weight:800; color:var(--accent); letter-spacing:1px">🌟 PROMPTS DESTACADOS</h2>
    </div>
    <div class="hero-carousel">
        <div class="carousel-track" style="${featured.length < 6 ? 'animation:none; justify-content:center; width:100%' : ''}">
            ${list.map((p, idx) => {
        const { applyBlur, warningLabel } = getModeration(p);

        // Determine badge type
        let badge = '';
        if (p.admin_featured) {
            badge = `<div style="position:absolute; top:10px; left:10px; background:rgba(139,0,255,0.95); color:white; padding:6px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; gap:5px">⚡ Admin</div>`;
        } else if (p.is_featured && new Date(p.featured_until) > new Date()) {
            badge = `<div style="position:absolute; top:10px; left:10px; background:rgba(241,196,15,0.95); color:#000; padding:6px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.4); display:flex; align-items:center; gap:5px">💎 Semana</div>`;
        } else {
            // Find organic rank (1-12)
            const organicRank = organicCandidates.findIndex(oc => oc.id === p.id);
            if (organicRank !== -1) {
                const rankNumber = organicRank + 1;

                // Color mapping for top 3
                let rankStyle = 'background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2);';
                let textColor = '#fff';

                if (rankNumber === 1) {
                    rankStyle = 'background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(255, 140, 0, 0.5);';
                    textColor = '#000';
                } else if (rankNumber === 2) {
                    rankStyle = 'background: linear-gradient(135deg, #E0E0E0 0%, #808080 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(128, 128, 128, 0.5);';
                    textColor = '#000';
                } else if (rankNumber === 3) {
                    rankStyle = 'background: linear-gradient(135deg, #CD7F32 0%, #8B4513 100%); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 0 15px rgba(139, 69, 19, 0.5);';
                    textColor = '#000';
                }

                badge = `<div style="position:absolute; top:10px; left:10px; ${rankStyle} color:${textColor}; width:34px; height:34px; border-radius:50%; font-size:1.1rem; font-weight:900; z-index:10; display:flex; align-items:center; justify-content:center; font-family:'Outfit', sans-serif;">${rankNumber}</div>`;
            }
        }

        return `
                <div class="carousel-item ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" style="cursor:pointer">
                    ${renderCollage(p, true)}
                    ${applyBlur ? `<div class="blur-overlay"><span>🔞 ${warningLabel}</span></div>` : ''}
                    ${badge}
                </div>`;
    }).join('')}
        </div>
    </div>`;
};
