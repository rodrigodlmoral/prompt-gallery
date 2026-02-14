import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const PromptsDiario = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    // Use provided prompts directly (already filtered and ranked by CEREBRO in the store)
    let featuredList = prompts;

    if (featuredList.length === 0) return '';

    const p = featuredList[0];
    const { applyBlur, warningLabel } = getModeration(p);
    const tags = (p.tags || []).slice(0, 3).map(t => `<span class="spotlight-chip">#${t}</span>`).join('');

    // Build Metadata Chips
    const metaChips = `
        <span class="spotlight-chip tool">${p.tool || 'AI Tool'}</span>
        <span class="spotlight-chip">${p.rating || 'SFW'}</span>
        ${p.needs_reference ? '<span class="spotlight-chip ref">📸 Ref Required</span>' : ''}
    `;

    return `
    <div class="premium-spotlight-card" data-post-id="${p.id}" style="--glow-color: rgba(231, 76, 60, 0.2); cursor:pointer">
        <div class="spotlight-glow"></div>
        
        <div class="spotlight-media ${applyBlur ? 'card-blurred' : ''}">
             ${renderCollage(p, true)}
             ${applyBlur ? `<div class="blur-overlay" style="font-size:0.55rem"><span>🔞 ${warningLabel}</span></div>` : ''}
        </div>

        <div class="spotlight-info">
            <div class="spotlight-badge" style="--badge-color: #e74c3c">🔥 TOP DIARIO</div>
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
