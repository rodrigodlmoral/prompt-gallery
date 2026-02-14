import { store } from '../store-final.js';
import { renderCollage } from './Collage.js';
import { renderTopCreators } from './TopCreators.js';

export const PromptCard = (p, currentUser, currentView, profileUser, profileTab, getModeration, isNew = false) => {
    const { applyBlur, warningLabel } = getModeration ? getModeration(p) : { applyBlur: false, warningLabel: '' };
    const reactions = p.reactions || { like: 0, love: 0, fire: 0, funny: 0 };

    return `<div class="card ${isNew ? 'fade-in-up' : ''}">
                <div class="card-img-wrap ${p.type !== 'sequence' && applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" data-warning="${applyBlur ? warningLabel : ''}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
                </div>
                <div class="card-overlay" data-post-id="${p.id}" style="cursor:pointer">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:5px">${window.escapeHTML(p.title)}</div>
                    <div style="font-size:0.8rem; opacity:0.8; margin-bottom:10px; cursor:pointer" onclick="event.stopPropagation(); window.openUserProfile('${p.author}')">por @${window.escapeHTML(p.author)}</div>
                    <div class="card-stats">
                        ${reactions.like > 0 ? `<span title="Me gusta">👍 ${reactions.like}</span>` : ''}
                        ${reactions.love > 0 ? `<span title="Me encanta">❤️ ${reactions.love}</span>` : ''}
                        ${reactions.fire > 0 ? `<span title="Fuego">🔥 ${reactions.fire}</span>` : ''}
                        ${reactions.funny > 0 ? `<span title="Divertido">😂 ${reactions.funny}</span>` : ''}
                        ${reactions.dislike > 0 ? `<span title="No me gusta">👎 ${reactions.dislike}</span>` : ''}
                        ${reactions.sad > 0 ? `<span title="Triste">😢 ${reactions.sad}</span>` : ''}
                        <span title="Copiado" style="color:var(--accent)">📋 ${p.copy_count || 0}</span>
                        <span title="PromptBits" onclick="event.stopPropagation(); window.openTip('${p.id}')" style="color:#a29bfe; cursor:pointer">💎 ${p.tokens_received || 0}</span>
                    </div>
                </div>
                
                 ${(currentView === 'profile' && profileUser === currentUser?.username && p.author === currentUser?.username) ? `
                 <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                     ${(currentUser?.level >= 4 && !p.is_featured) ? `<button class="btn-icon" style="background:rgba(241,196,15,0.8); padding:5px; width:auto; height:30px; font-size:0.75rem; color:black; font-weight:700" onclick="event.stopPropagation(); window.doPromotePrompt('${p.id}')" title="Destacar por 1 semana (50 PromptBits)">💎 50 PromptBits</button>` : ''}
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doEditPrompt('${p.id}')" title="Editar">✏️</button>
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doDeletePrompt('${p.id}')" title="Eliminar Post">🗑️</button>
                 </div>` : ''}

                 ${(currentView === 'profile' && profileUser === currentUser?.username && profileTab === 'saved') ? `
                 <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                     <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doUnsave('${p.id}')" title="Quitar de Favoritos">❌</button>
                 </div>` : ''}
            </div>`;
};

export const Gallery = ({
    prompts,
    currentUser,
    currentView,
    profileUser,
    profileTab,
    filters,
    getModeration,
    topCreatorsList,
    searchQuery
}) => {
    const list = prompts;
    const isMyProfile = (currentView === 'profile' && profileUser === currentUser?.username && profileTab === 'creations');

    if (list.length === 0) {
        if (isMyProfile) {
            return `
    <div class="container" style = "padding: 40px 20px; text-align: center;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 1px dashed #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 4rem; margin-bottom: 20px;">✨</div>
            <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Tu galería está lista para brillar!</h2>
            <p style="color: #888; font-size: 1.1rem; margin-bottom: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                Aún no has compartido ningún prompt. ¡Sé el primero en inspirar a la comunidad con tus creaciones!
            </p>
            <button class="btn" onclick="document.getElementById('createModal').style.display = 'flex'" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px; background: var(--accent); color: white; border: none; cursor: pointer; transition: transform 0.2s; font-weight: bold; box-shadow: 0 5px 15px var(--accent-alpha);">
                🚀 Comparte tu primer prompt
            </button>
        </div>
            </div> `;
        } else if (currentView === 'profile') {
            return `
    <div class="container" style = "padding: 80px 20px; text-align: center; color: #666;">
                <div style="font-size: 3rem; margin-bottom: 20px; grayscale: 1; opacity: 0.5;">🏜️</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Este usuario aún no ha compartido prompts</h3>
                <p>Vuelve más tarde para ver sus creaciones.</p>
            </div> `;
        } else {
            // Home / Search / Filter view empty state
            return `<div class="container" style="text-align:center; padding:100px 20px; color:#666;">
                <div style="font-size:3rem; margin-bottom:20px">🔍</div>
                <h3>No se encontraron prompts</h3>
                <p>Prueba ajustando los filtros o buscando otra cosa.</p>
                ${(filters.tools.length > 0 || filters.tags.length > 0 || searchQuery) ?
                    '<button class="btn-primary" style="margin-top:20px; padding:10px 20px; border-radius:8px; cursor:pointer;" onclick="window.clearAllFilters()">Limpiar Filtros</button>' : ''}
            </div>`;
        }
    }

    const showTopCreators = currentView === 'home' && filters.source === 'community';

    const skeletons = store.isLoadingMore ? `
        <div class="card skeleton-card"></div>
        <div class="card skeleton-card"></div>
        <div class="card skeleton-card"></div>
    ` : '';

    return `<div class="container"> <div class="gallery-grid" id="gallery-root">
    ${list.map((p, idx) => {
        const card = PromptCard(p, currentUser, currentView, profileUser, profileTab, getModeration, false);
        const topCreatorsBanner = (idx === 11 && showTopCreators) ? `</div>${renderTopCreators(topCreatorsList, currentUser)}<div class="gallery-grid">` : '';
        const adBanner = (idx > 11 && (idx + 1) % 12 === 0) ? `</div><div class="ad-banner"></div><div class="gallery-grid">` : '';
        return card + topCreatorsBanner + adBanner;
    }).join('')}
    ${skeletons}
</div>
    
    <!-- BOTÓN DE CARGA MANUAL (ESTRICTAMENTE BAJO DEMANDA) -->
    ${store.hasMore ? `
        <div id="scroll-sentinel" class="manual-load-container" style="margin: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div id="sentinel-visual" style="color: var(--accent); opacity: 0.8; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 900; background: rgba(59, 130, 246, 0.1); padding: 5px 15px; border-radius: 4px;">
                MOSTRAR SIGUIENTES 60 POSTS
            </div>
            
            <button class="btn-primary" onclick="window.forceLoadMore()" id="manual-load-btn" style="
                background: linear-gradient(135deg, var(--accent) 0%, #1e40af 100%);
                color: white;
                border: none;
                padding: 18px 45px;
                font-size: 1.1rem;
                font-weight: 800;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 10px 25px var(--accent-alpha);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex;
                align-items: center;
                gap: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">
                <span style="font-size: 1.3rem;">🔄</span> MOSTRAR SIGUIENTES POSTS
            </button>
            <div id="loading-spinner-sentinel" style="display:none; font-size:1.5rem; animation: spin 1s linear infinite;">⏳</div>
        </div>
    ` : ''}
    <div style="height:40px; width:100%"></div>

    ${!currentUser ? `
    <div class="container" style="margin-top: 40px; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 2px solid var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🔓</div>
            <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Desbloquea toda la galería!</h2>
            <p style="color: #888; font-size: 1.1rem; margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
                Has visto los 12 prompts más recientes. Regístrate gratis para acceder a toda la colección, guardar tus favoritos y compartir tus propias creaciones.
            </p>

            <!-- Stats Bar -->
            <div style="display: flex; gap: 30px; justify-content: center; margin-bottom: 35px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.users.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">👤 Usuarios</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.prompts.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">🖼️ Prompts</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.visits.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">🔥 Visitas</div>
                </div>
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <button class="btn" onclick="window.openRegister()" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px; background: var(--accent); color: white; border: none; cursor: pointer; font-weight: bold; box-shadow: 0 5px 15px var(--accent-alpha);">
                    🚀 Crear Cuenta Gratis
                </button>
                <button class="btn-outline" onclick="window.openLogin()" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px;">
                    🔑 Iniciar Sesión
                </button>
            </div>
        </div>
    </div>
    ` : ''
        }
    </div></div> `;
};
