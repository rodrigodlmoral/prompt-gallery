import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const PromptsSemanal = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    let featuredList = prompts;
    if (!featuredList || featuredList.length === 0) return '';

    return featuredList.map(p => {
        const { applyBlur, warningLabel } = getModeration(p);
        const tags = (p.tags || []).slice(0, 3).map(t => `<span class="spotlight-chip">#${t}</span>`).join('');

        const metaChips = `
            <span class="spotlight-chip tool">${p.tool || 'AI Tool'}</span>
            <span class="spotlight-chip">${p.rating || 'SFW'}</span>
            ${p.needs_reference ? '<span class="spotlight-chip ref">📸 Ref Required</span>' : ''}
        `;

        return `
        <div class="premium-spotlight-card" data-post-id="${p.id}" style="--glow-color: rgba(241, 196, 15, 0.2); cursor:pointer; margin-bottom: 25px;">
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
    }).join('');
};
