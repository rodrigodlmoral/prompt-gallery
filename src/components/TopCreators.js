import { escapeHTML } from '../utils/security.js';
import { store, LEVEL_REQS } from '../store-final.js';
import { createCompactLevelBadge } from './LevelBadge.js';
import { pb } from '../pocketbase.js';

export const renderTopCreators = (details, currentUser) => {
    // Hide for visitors (no currentUser) or empty details
    if (!currentUser || !details || details.length === 0) return '';
    return `
    <div class="top-creators-banner">
        <div class="tc-header">
            <div>
                <div class="tc-title">⭐ TOP CREADORES</div>
                <div class="tc-subtitle">CUADRO DE HONOR • LOS 10 MEJORES</div>
            </div>
        </div>
        <div class="tc-grid">
            ${details.map((u, idx) => {
        const username = u.username || u.name || 'Usuario';

        let avatar = u.avatar_url || u.avatar;
        // Fix: Ensure we have a full URL
        if (avatar && !avatar.startsWith('http') && !avatar.startsWith('data:')) {
            // It's a filename, assume we need to generate URL
            avatar = pb.files.getUrl(u, avatar);
        }
        if (!avatar) {
            avatar = `https://robohash.org/${encodeURIComponent(username)}?set=set4`;
        }

        // Rank Styling
        const rank = idx + 1;
        let cardStyle = '';
        let rankBadgeStyle = '';

        if (rank === 1) {
            cardStyle = 'border: 1px solid #FFD700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);';
            rankBadgeStyle = 'background: #FFD700; color: #000;';
        } else if (rank === 2) {
            cardStyle = 'border: 1px solid #C0C0C0;';
            rankBadgeStyle = 'background: #C0C0C0; color: #000;';
        } else if (rank === 3) {
            cardStyle = 'border: 1px solid #CD7F32;';
            rankBadgeStyle = 'background: #CD7F32; color: #000;';
        } else {
            cardStyle = 'border: 1px solid #333;';
            rankBadgeStyle = 'background: #333; color: #fff;';
        }

        // Get Level Info from V3 Config
        const userLevel = u.level || 0;
        const levelInfo = LEVEL_REQS[userLevel] || LEVEL_REQS[0];

        return `
                <div class="tc-card" onclick="window.openUserProfile('${username}')" style="cursor:pointer; ${cardStyle} position:relative; display:flex; flex-direction:column; align-items:center; padding:15px 10px; background:#111; border-radius:12px; height:180px; justify-content:space-between;">
                    
                    <div class="tc-avatar-container" style="position:relative; margin-bottom:5px;">
                        <div class="tc-avatar" style="background-image: url('${avatar}'); width:60px; height:60px; border-radius:50%; background-size:cover; background-position:center; border:2px solid #222;"></div>
                        <div class="tc-rank" style="position:absolute; top:-5px; right:-5px; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:900; ${rankBadgeStyle}">#${rank}</div>
                    </div>

                    <div class="tc-info" style="text-align:center; width:100%;">
                        <div class="tc-name" style="font-weight:700; font-size:0.95rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; margin-bottom:2px;">${username}</div>
                        <div class="tc-stats" style="font-size:0.7rem; color:#888; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                            ${u.prompts_count || 0} PROMPTS
                        </div>
                    </div>

                    <div class="tc-level-badge" style="
                        display: inline-flex;
                        align-items: center;
                        gap: 0.3rem;
                        padding: 4px 10px;
                        border-radius: 10px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        background: ${levelInfo.color}20;
                        border: 1.5px solid ${levelInfo.color};
                        color: ${levelInfo.color};
                        margin-top: 5px;
                    ">
                        <span style="font-size: 0.85rem;">${levelInfo.icon}</span>
                        <span>Nv ${userLevel}</span>
                    </div>
                </div>`;
    }).join('')}
        </div>
    </div>
    }).join('')}
        </div>
    </div>
    
    <style>
        .top-creators-banner {
            padding: 20px 0;
        }
        .tc-header {
            margin-bottom: 20px;
        }
        .tc-title {
            font-size: 1.5rem;
            font-weight: 900;
            color: #eee;
            text-transform: uppercase;
        }
        .tc-subtitle {
            font-size: 0.8rem;
            color: #3b82f6; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .tc-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 10px;
        }
        /* Scrollbar styles for horizontal scroll if needed on mobile */
        .tc-grid::-webkit-scrollbar {
            height: 4px;
        }
        .tc-grid::-webkit-scrollbar-track {
            background: #111;
        }
        .tc-grid::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 2px;
        }
        
        @media (max-width: 600px) {
            .tc-grid {
                display: flex;
                flex-wrap: nowrap;
            }
            .tc-card {
                min-width: 110px;
            }
        }
    </style>
    `;
};
