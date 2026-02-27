import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const PromptsDiario = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    let featuredList = prompts;
    if (!featuredList || featuredList.length === 0) {
        return `
        <div class="premium-spotlight-card" style="--glow-color: rgba(231, 76, 60, 0.15); margin-bottom: 25px; justify-content: center; text-align: center; min-height: 140px;">
            <div class="spotlight-glow"></div>
            <div class="spotlight-info" style="align-items: center;">
                <div class="spotlight-badge" style="--badge-color: #e74c3c">🔥 TOP DIARIO</div>
                <div style="color: #888; font-size: 0.95rem; margin: 8px 0;">No hay Boosts Diarios activos</div>
                <div style="color: #666; font-size: 0.8rem;">¡Destaca tu prompt por 24 horas! Activa un Boost desde tu perfil.</div>
            </div>
        </div>`;
    }

    // Single prompt: render simple card (no carousel controls)
    if (featuredList.length === 1) {
        const p = featuredList[0];
        const { applyBlur, warningLabel } = getModeration(p);
        const tags = (p.tags || []).slice(0, 3).map(t => `<span class="spotlight-chip">#${t}</span>`).join('');
        const metaChips = `
            <span class="spotlight-chip tool">${p.tool || 'AI Tool'}</span>
            <span class="spotlight-chip">${p.rating || 'SFW'}</span>
            ${p.needs_reference ? '<span class="spotlight-chip ref">📸 Ref Required</span>' : ''}
        `;
        return `
        <div class="premium-spotlight-card" data-post-id="${p.id}" style="--glow-color: rgba(231, 76, 60, 0.2); cursor:pointer; margin-bottom: 25px;">
            <div class="spotlight-glow"></div>
            <div class="spotlight-media ${applyBlur ? 'card-blurred' : ''}">
                 ${renderCollage(p, true)}
                 ${applyBlur ? `<div class="blur-overlay" style="font-size:0.55rem"><span>🔞 ${warningLabel}</span></div>` : ''}
            </div>
            <div class="spotlight-info">
                <div class="spotlight-badge" style="--badge-color: #e74c3c">🔥 TOP DIARIO</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 4px; line-height: 1.2;">${p.title}</div>
                <div class="spotlight-meta-row">${metaChips}</div>
                <div class="spotlight-meta-row" style="margin-top: 10px; opacity: 0.7">${tags}</div>
            </div>
        </div>`;
    }

    // Multiple prompts: render single card with internal carousel
    const slides = featuredList.map((p, i) => {
        const { applyBlur, warningLabel } = getModeration(p);
        const tags = (p.tags || []).slice(0, 3).map(t => `<span class="spotlight-chip">#${t}</span>`).join('');
        const metaChips = `
            <span class="spotlight-chip tool">${p.tool || 'AI Tool'}</span>
            <span class="spotlight-chip">${p.rating || 'SFW'}</span>
            ${p.needs_reference ? '<span class="spotlight-chip ref">📸 Ref Required</span>' : ''}
        `;
        return `
        <div class="boost-slide" data-post-id="${p.id}" data-slide-index="${i}" style="display: ${i === 0 ? 'flex' : 'none'}; cursor:pointer;">
            <div class="spotlight-media ${applyBlur ? 'card-blurred' : ''}">
                 ${renderCollage(p, true)}
                 ${applyBlur ? `<div class="blur-overlay" style="font-size:0.55rem"><span>🔞 ${warningLabel}</span></div>` : ''}
            </div>
            <div class="spotlight-info">
                <div class="spotlight-badge" style="--badge-color: #e74c3c">🔥 TOP DIARIO</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 4px; line-height: 1.2;">${p.title}</div>
                <div class="spotlight-meta-row">${metaChips}</div>
                <div class="spotlight-meta-row" style="margin-top: 10px; opacity: 0.7">${tags}</div>
            </div>
        </div>`;
    }).join('');

    // Dots indicator
    const dots = featuredList.map((_, i) =>
        `<span class="boost-dot ${i === 0 ? 'active' : ''}" data-dot="${i}" onclick="window.goBoostSlide('diario', ${i})"></span>`
    ).join('');

    return `
    <div class="premium-spotlight-card boost-carousel-card" id="boost-diario-carousel" style="--glow-color: rgba(231, 76, 60, 0.2); margin-bottom: 25px; position:relative;">
        <div class="spotlight-glow"></div>
        ${slides}
        <div class="boost-dots-container">
            ${dots}
        </div>
        <button class="boost-nav-btn boost-prev" onclick="event.stopPropagation(); window.navBoostSlide('diario', -1)">‹</button>
        <button class="boost-nav-btn boost-next" onclick="event.stopPropagation(); window.navBoostSlide('diario', 1)">›</button>
    </div>`;
};
