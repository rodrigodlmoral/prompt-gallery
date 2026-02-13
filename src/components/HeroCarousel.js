import { store } from '../store-final.js';
import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const HeroCarousel = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    // === TOP 20 ORGANIC: UNIFIED RANKING ===
    const allPublic = [...prompts].filter(p => !p.isPrivate);

    // Calculate engagement score function
    function calculateEngagementScore(p) {
        // formula: Reactions + Comments + Saves + Copies + PromptBits
        const reactions = Object.values(p.reactions || {}).reduce((sum, val) => sum + val, 0);
        const comments = (p.comments || []).length;
        const saves = (p.saved_by || []).length;
        const copies = p.copy_count || 0;
        const tips = p.tokens_received || 0;
        return reactions + comments + saves + copies + tips;
    }

    // Generate ranked list
    const featured = allPublic
        .map(p => ({ ...p, engagementScore: calculateEngagementScore(p) }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 20);

    if (featured.length === 0) return '';

    // Duplicate for infinite scroll if needed (at least 6 items for smooth scroll)
    const list = featured.length < 6 ? featured : featured.concat(featured);

    return `
    <div class="container" style="margin-top:20px; margin-bottom:-5px">
        <div class="spotlight-badge" style="--badge-color: var(--accent); font-size: 1.2rem; padding: 12px 30px; font-weight: 1000; letter-spacing: 2px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);">
            🌟 TOP 20 PROMPTS
        </div>
    </div>
    <div class="hero-carousel">
        <div class="carousel-track" style="${featured.length < 6 ? 'animation:none; justify-content:center; width:100%' : ''}">
            ${list.map((p, idx) => {
        const { applyBlur, warningLabel } = getModeration(p);

        // Find actual rank in the original featured array (handling duplicated list index)
        const rankNumber = (idx % featured.length) + 1;

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

        const badge = `<div style="position:absolute; top:10px; left:10px; ${rankStyle} color:${textColor}; width:34px; height:34px; border-radius:50%; font-size:1.1rem; font-weight:900; z-index:10; display:flex; align-items:center; justify-content:center; font-family:'Outfit', sans-serif;">${rankNumber}</div>`;

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
