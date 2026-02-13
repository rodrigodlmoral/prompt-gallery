import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const PromptsSemanal = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    // Filter prompts that have a weekly boost
    let featuredList = prompts.filter(p => {
        if (p.is_private) return false;
        return p.is_featured && p.featured_until && new Date(p.featured_until) > new Date();
    });

    // MOCK DATA FOR TESTING: Pick 3 as requested
    if (featuredList.length === 0 && prompts.length > 0) {
        const publicPrompts = prompts.filter(p => !p.is_private);
        featuredList = publicPrompts.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    if (featuredList.length === 0) return '';

    const renderSpotlightItem = (p, index, total) => {
        const { applyBlur, warningLabel } = getModeration(p);
        const tags = (p.tags || []).slice(0, 3).map(t => `<span class="spotlight-chip">#${t}</span>`).join('');

        const metaChips = `
            <span class="spotlight-chip tool">${p.tool || 'AI Tool'}</span>
            <span class="spotlight-chip">${p.rating || 'SFW'}</span>
            ${p.needs_reference ? '<span class="spotlight-chip ref">📸 Ref Required</span>' : ''}
        `;

        // Animation logic: 7s per slide (1s in, 5s stay, 1s out). Total = total * 7
        // pointer-events: none ensures only the visible card can be clicked.
        const duration = total * 7;
        const delay = index * 7;
        const animationStyle = total > 1
            ? `animation: spotlightFade ${duration}s infinite; animation-delay: -${delay}s; position: ${index === 0 ? 'relative' : 'absolute'}; top:0; left:0; width:100%; height:100%; opacity:0; pointer-events:none;`
            : 'position: relative;';

        return `
        <div class="premium-spotlight-card spotlight-item" data-post-id="${p.id}" style="--glow-color: rgba(241, 196, 15, 0.2); cursor:pointer; ${animationStyle}">
            <div class="spotlight-glow"></div>
            
            <div class="spotlight-media ${applyBlur ? 'card-blurred' : ''}">
                 ${renderCollage(p, true)}
                 ${applyBlur ? `<div class="blur-overlay" style="font-size:0.55rem"><span>🔞 ${warningLabel}</span></div>` : ''}
            </div>

            <div class="spotlight-info">
                <div class="spotlight-badge" style="--badge-color: #f1c40f">💎 TOP SEMANAL</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 4px; line-height: 1.2;">${p.title}</div>
                
                <div class="spotlight-meta-row">
                    ${metaChips}
                </div>

                <div class="spotlight-meta-row" style="margin-top: 10px; opacity: 0.7">
                    ${tags}
                </div>
            </div>
        </div>`;
    };

    // Note: I use a negative delay (-delay) so they start at different points of the SAME cycle immediately.
    return `
    <div style="position: relative; width: 100%; min-height: 220px;">
        ${featuredList.map((p, i) => renderSpotlightItem(p, i, featuredList.length)).join('')}
    </div>
    
    <style>
    @keyframes spotlightFade {
        0% { opacity: 0; transform: translateY(10px); pointer-events: none; }
        2.38%, 30.95% { opacity: 1; transform: translateY(0); pointer-events: auto; }
        33.33%, 100% { opacity: 0; transform: translateY(-10px); pointer-events: none; }
    }
    </style>
    `;
};
