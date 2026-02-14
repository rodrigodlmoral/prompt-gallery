import { store } from '../store-final.js';
import { renderCollage } from './Collage.js';
import { getModeration } from '../utils/security.js';

export const HeroCarousel = ({ currentView, prompts }) => {
    if (currentView !== 'home') return '';

    // Use provided prompts directly (already ranked by CEREBRO in main.js)
    const featured = prompts;

    if (featured.length === 0) return '';

    // Duplicate for infinite scroll if needed (at least 6 items for smooth scroll)
    const list = featured.length < 6 ? featured : featured.concat(featured).concat(featured);

    return `
    <div class="container" style="margin-top:20px; margin-bottom:-5px; position:relative;">
        <div class="spotlight-badge" style="--badge-color: var(--accent); font-size: 1.2rem; padding: 12px 30px; font-weight: 1000; letter-spacing: 2px; box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);">
            🌟 TOP 20 PROMPTS
        </div>
    </div>
    
    <div class="hero-carousel-wrapper" style="position:relative; group">
        <button class="carousel-nav prev" onclick="window.navHeroCarousel(-1)" style="left: 10px;">❮</button>
        <button class="carousel-nav next" onclick="window.navHeroCarousel(1)" style="right: 10px;">❯</button>
        
        <div class="hero-carousel" id="hero-carousel-container" style="cursor: grab; overflow: hidden; white-space: nowrap; user-select: none;">
            <div class="carousel-track" id="hero-carousel-track" style="animation: none; width: max-content; display: flex; gap: 15px; padding: 10px 0;">
                ${list.map((p, idx) => {
        const { applyBlur, warningLabel } = getModeration(p);
        const rankNumber = (idx % featured.length) + 1;

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
                    <div class="carousel-item ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" style="cursor:pointer; flex-shrink:0;">
                        ${renderCollage(p, true)}
                        ${applyBlur ? `<div class="blur-overlay"><span>🔞 ${warningLabel}</span></div>` : ''}
                        ${badge}
                    </div>`;
    }).join('')}
            </div>
        </div>
    </div>
    
    <style>
        .carousel-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.5);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            opacity: 0;
            transition: all 0.3s;
            backdrop-filter: blur(5px);
        }
        .hero-carousel-wrapper:hover .carousel-nav {
            opacity: 1;
        }
        .carousel-nav:hover {
            background: var(--accent);
            transform: translateY(-50%) scale(1.1);
            border-color: white;
        }
        .hero-carousel:active {
            cursor: grabbing;
        }
    </style>
    `;
};
