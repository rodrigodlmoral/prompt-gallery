import './style.css'
// Deploy Timestamp: 2026-02-09T00:55:00-06:00 (Unified Advanced Filters)
import { store, LEVEL_REQS, TOOLS, RATINGS, RATING_INFO, INFO_ICON } from './store-final.js'
import { pb } from './pocketbase.js';
import { AdvancedFilters } from './components/AdvancedFilters.js';
import { TAG_CATEGORIES } from './data/tags.js';
import { TAG_ALIASES } from './data/tagAliases.js';
import { DetailModalTemplate } from './components/DetailModal.js';
import { TextDetailModalTemplate, initTextModalLogic } from './components/TextDetailModal.js';
import { SearchSuggestions } from './components/SearchSuggestions.js';

// Initialize Text Modal Logic
initTextModalLogic();
import { getSearchSuggestions } from './utils/search-logic.js';
import { initEconomyDashboard } from './components/EconomyDashboard.js';
import { initLiveChat } from './components/LiveChat.js';
import { setupLevelModals } from './components/Modals/LevelModals.js';
import { toast } from './utils/ui-helpers.js';
import { MarketplaceTab } from './components/MarketplaceTab.js';
import './utils/LevelDebug.js'; // Load Debug Tools

// Initialize Modals
setupLevelModals();

const app = document.getElementById('app');

// --- MODO MANTENIMIENTO (Activar/Desactivar aquí) ---
const MAINTENANCE_MODE = false;

const renderMaintenance = () => {
    // 1. Apply blur and safety to the main app container
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.style.filter = 'blur(20px) saturate(150%)';
        appContainer.style.pointerEvents = 'none';
        appContainer.style.userSelect = 'none';
        appContainer.style.transition = 'filter 1s ease';
    }

    // 2. Create the Fixed Overlay
    const overlay = document.createElement('div');
    overlay.id = 'maintenance-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        overflow: hidden;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
    `;

    overlay.innerHTML = `
        <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%); pointer-events: none;"></div>
        <div class="maint-scene" style="perspective: 1500px; width: 100%; display: flex; justify-content: center; align-items: center;">
            <div class="maint-card" style="
                width: 95%;
                max-width: 550px;
                background: rgba(20, 20, 20, 0.6);
                backdrop-filter: blur(30px) saturate(200%);
                -webkit-backdrop-filter: blur(30px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 48px;
                padding: 70px 40px;
                box-shadow: 
                    0 50px 100px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                    0 0 40px rgba(59, 130, 246, 0.1);
                transform: rotateX(12deg) rotateY(-8deg);
                animation: float3d 8s ease-in-out infinite;
                position: relative;
                overflow: hidden;
            ">
                <!-- Depth Gloss -->
                <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(135deg, transparent, rgba(255,255,255,0.05), transparent); transform: rotate(45deg); pointer-events: none;"></div>
                
                <div style="position: relative; z-index: 1; text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 25px; filter: drop-shadow(0 20px 40px rgba(59, 130, 246, 0.6));">💎</div>
                    <h1 style="
                        font-size: clamp(1.8rem, 8vw, 2.5rem); 
                        font-weight: 1000; 
                        margin-bottom: 25px; 
                        text-transform: uppercase;
                        letter-spacing: -1px;
                        background: linear-gradient(135deg, #fff 0%, #3b82f6 50%, #1d4ed8 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        line-height: 1;
                        white-space: nowrap;
                    ">PROMPT-GALLERY</h1>
                    
                    <div style="
                        display: inline-block;
                        padding: 8px 20px;
                        background: rgba(59, 130, 246, 0.15);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        border-radius: 100px;
                        color: #93c5fd;
                        font-size: 0.7rem;
                        font-weight: 900;
                        letter-spacing: 3px;
                        text-transform: uppercase;
                        margin-bottom: 40px;
                    ">Mantenimiento de Elite</div>

                    <p style="color: rgba(255,255,255,0.7); line-height: 1.8; font-size: 1.15rem; font-weight: 400; margin-bottom: 45px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        Estamos recalibrando los servidores para el lanzamiento oficial de la nueva identidad.
                    </p>
                </div>
            </div>
        </div>
        <style>
            @keyframes float3d {
                0%, 100% { transform: rotateX(12deg) rotateY(-8deg) translateY(0px); }
                50% { transform: rotateX(15deg) rotateY(-5deg) translateY(-20px); }
            }
        </style>
    `;
    document.body.appendChild(overlay);
};

// --- STATE ---
let currentView = 'profile'; // Fixed view for this file
let profileUser = new URLSearchParams(window.location.search).get('u') || '';
let profileTab = 'creations';
let profileTextPrompts = []; // Cache for text prompts on the profile page
let searchQuery = '';
let filters = {
    source: 'community',
    sort: 'newest',
    time: 'all',
    tools: [],
    refFilter: 'all',
    ratings: [],
    categories: [],
    tags: []
};

window.handleSearchTyping = (val) => {
    const query = val.trim();
    const mount = document.getElementById('search-suggestions-mount');
    if (!mount) return;
    if (query.length === 0) {
        mount.innerHTML = '';
        return;
    }
    const results = getSearchSuggestions({ query, store });
    mount.innerHTML = SearchSuggestions(results);
};

window.handleSearch = (val) => {
    searchQuery = val;
    const di = document.getElementById('searchInput'); if (di) di.value = val;
    const mount = document.getElementById('search-suggestions-mount'); if (mount) mount.innerHTML = '';

    // In profile, search filters the current user posts usually, but we keep it global or per requirements
    render();
};

window.handleTagSearch = (tag) => {
    searchQuery = tag;
    const di = document.getElementById('searchInput'); if (di) di.value = tag;
    const mount = document.getElementById('search-suggestions-mount'); if (mount) mount.innerHTML = '';
    render();
};

// Global click to close suggestions
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        const mount = document.getElementById('search-suggestions-mount');
        if (mount) mount.innerHTML = '';
    }
});
// Obsoleta, ahora en store (store.activePostId, store.currentSeqStep)
let currentTipPostId = null;
window.sliderUnlocked = false;
let seqStepCount = 0;
let isEditing = false;
let editingId = null;

// --- TAGS STATE ---
window.selectedTags = new Set();
window.openCategory = null;

// --- SAFETY CHECK: Ensure NSFW Reveal Buttons always exist in Detail View ---
setInterval(() => {
    document.querySelectorAll('.card-blurred').forEach(wrapper => {
        let overlay = wrapper.querySelector('.blur-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'blur-overlay';
            wrapper.appendChild(overlay);
        }

        const isModal = wrapper.closest('.view-modal-wrapper') || wrapper.id === 'detImgWrap';
        const hasButton = overlay.querySelector('button');
        const hasLabel = overlay.querySelector('span');
        const warningLabel = wrapper.dataset.warning || "NSFW";

        if (isModal) {
            if (!hasButton) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span><button class="btn" style="margin-top:10px; background: #ff4444; color: white; border:none; padding: 5px 10px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); window.revealImage(this)">👁️ Revelar Imagen</button>`;
            }
        } else {
            if (hasButton || !hasLabel) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span>`;
            }
        }
    });
}, 500);

// --- CONSTANTS ---
// Constants imported from store-final.js

// --- HELPERS ---
window.openUserProfile = (username) => {
    window.location.href = `/profile.html?u=${encodeURIComponent(username)}`;
};

window.setFilter = (key, value) => {
    filters[key] = value;
    if (window.render) window.render();
};

window.toggleFilter = (key, value) => {
    const idx = filters[key].indexOf(value);
    if (idx > -1) filters[key].splice(idx, 1);
    else filters[key].push(value);
    if (window.render) window.render();
};

window.toggleAdvancedFilters = () => {
    const el = document.getElementById('advFilterPanel');
    if (el) el.classList.toggle('active');
};

window.clearAllFilters = () => {
    filters.tools = [];
    filters.ratings = [];
    filters.refFilter = 'all';
    filters.categories = [];
    filters.tags = [];
    if (window.render) window.render();
};

window.escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const isImageFile = (file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    return validTypes.includes(file.type);
};

// --- MODERATION LOGIC ---
const getModeration = (p, forcedRating) => {
    let rating = forcedRating || p.rating || 'SFW / Apto';
    if (!forcedRating && p.type === 'sequence' && p.content && p.content.length > 0) {
        rating = p.content[0].rating || 'SFW / Apto';
    }
    const mod = store.currentUser?.moderation || { suggestive: 'ON', nsfw: 'BLUR' };
    let applyBlur = false; let warningLabel = '';
    if (rating === 'Sugestivo' && mod.suggestive === 'BLUR') { applyBlur = true; warningLabel = 'SUGESTIVO'; }
    if (rating === 'NSFW / +18' && mod.nsfw === 'BLUR') { applyBlur = true; warningLabel = 'NSFW'; }
    return { applyBlur, warningLabel };
};

// --- CONSTANTS ---
// LEVEL_REQS imported from store-final.js

const renderCollage = (p) => {
    if (p.type !== 'sequence' || !p.content || p.content.length === 0) {
        return `<img src="${p.image || ''}" loading="lazy">`;
    }
    const items = p.content.slice(0, 6);
    const count = items.length;
    let gridStyle = '';
    if (count === 1) gridStyle = 'grid-template-columns: 1fr; grid-template-rows: 1fr;';
    else if (count === 2) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr;';
    else if (count === 3) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 4) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 5) gridStyle = 'grid-template-columns: repeat(6, 1fr); grid-template-rows: 1fr 1fr;';
    else if (count >= 6) gridStyle = 'grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr;';

    return `
    <div class="card-collage" style = "${gridStyle}" >
        ${items.map((step, idx) => {
        const { applyBlur } = getModeration(p, step.rating);
        let spanStyle = '';
        if (count === 3 && idx === 0) spanStyle = 'grid-column: span 2;';
        if (count === 5) {
            if (idx < 2) spanStyle = 'grid-column: span 3;';
            else spanStyle = 'grid-column: span 2;';
        }
        return `
            <div class="collage-item ${applyBlur ? 'card-blurred' : ''}" data-warning="${applyBlur ? warningLabel : ''}" style="${spanStyle}">
                <img src="${step.image}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            </div>`;
    }).join('')
        }
    </div> `;
};

// --- COMPONENTS ---
const Header = () => `
    <header style = "height:auto; display:flex; flex-direction:column" >
        <div class="container" style="height:72px; border-bottom:1px solid #222">
            <div class="logo" onclick="window.location.href='/'" style="cursor:pointer; ${!store.currentUser ? 'position: absolute; left: 50%; transform: translateX(-50%); font-size: 1.76rem; z-index: 10;' : ''}">
                <span style="-webkit-text-fill-color: initial; text-shadow: 0 0 10px rgba(255,255,255,0.2);">💎</span>
                <span style="background: linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">PROMPT-GALLERY</span>
            </div>
            ${store.currentUser ? `
            <div class="search-bar search-desktop" style="position:relative">
                <!-- Trap for Chrome Autofill -->
                <input type="password" style="display:none" autocomplete="new-password">
                <input type="text" class="search-input" id="searchInput" placeholder="${store.currentUser?.username === profileUser ? 'Buscar en MIS prompts... 👤' : 'Buscar en este perfil... 🎯'}" value="${searchQuery}" autocomplete="chrome-off-v3" spellcheck="false" name="prof_find_v${Date.now()}">
                <div id="search-suggestions-mount"></div>
            </div>
            ` : ''}
            <nav>
                ${store.currentUser ? `
                ${store.currentUser.role === 'admin' ? `<a href="/admin.html" class="btn-outline" style="border-color:gold; color:gold; text-decoration:none; padding: 10px 15px; border-radius: 8px; font-weight: 600;">👑 Admin</a>` : ''}
                <button class="btn" onclick="window.openCreate()">Compartir Prompt</button>
                <div class="user-info" onclick="window.location.href='/profile.html?u=${store.currentUser.username}'" style="cursor:pointer">
                    <div class="user-avatar-sm" style="background-image:url('${store.currentUser.avatar || 'https://robohash.org/' + store.currentUser.username}')"></div>
                    <span>${store.currentUser.username}</span>
                </div>
                <button class="btn-outline" onclick="window.doLogout()">Salir</button>
            ` : ''}
            </nav>

            <!-- Mobile Search & Menu Toggle -->
            ${store.currentUser ? `
            <div style="display:flex; align-items:center; gap:10px" class="mobile-only-flex">
                <div class="search-mobile-btn" onclick="document.querySelector('.search-mobile-overlay').classList.add('active'); document.getElementById('searchMobileInput').focus()">🔍</div>
                <button class="mobile-menu-btn" onclick="window.toggleMobileNav()">☰</button>
            </div>
            ` : ''}
        </div>
        ${store.currentUser ? `
        <div class="container filters-bar" style="padding:10px 20px; display:flex; gap:8px; overflow-x:auto; background:rgba(0,0,0,0.3); align-items:center; justify-content: flex-end">
            <select onchange="window.setFilter('time', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
                <option value="all" ${filters.time === 'all' ? 'selected' : ''}>📅 Todo el tiempo</option>
                <option value="today" ${filters.time === 'today' ? 'selected' : ''}>Hoy</option>
                <option value="week" ${filters.time === 'week' ? 'selected' : ''}>Esta Semana</option>
                <option value="month" ${filters.time === 'month' ? 'selected' : ''}>Este Mes</option>
            </select>
            <select onchange="window.setFilter('sort', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
                <option value="newest" ${filters.sort === 'newest' ? 'selected' : ''}>🔥 Más Recientes</option>
                <option value="popular" ${filters.sort === 'popular' ? 'selected' : ''}>❤️ Más Populares</option>
                <option value="commented" ${filters.sort === 'commented' ? 'selected' : ''}>💬 Más Comentados</option>
                <option value="oldest" ${filters.sort === 'oldest' ? 'selected' : ''}>👴 Más Antiguos</option>
            </select>
            
            <button class="btn-outline" onclick="window.toggleAdvancedFilters()" style="padding: 6px 12px; font-size: 0.85rem; display: flex; align-items:center; gap:8px; white-space:nowrap; border-radius:8px">
                🔍 Filtros Avanzados ${(filters.tools.length + filters.ratings.length + filters.tags.length + (filters.refFilter !== 'all' ? 1 : 0)) > 0 ? `<span style="background:#0070ba; color:white; border-radius:10px; padding:0 6px; font-size:0.7rem">${filters.tools.length + filters.ratings.length + filters.tags.length + (filters.refFilter !== 'all' ? 1 : 0)}</span>` : ''}
            </button>
        </div>
        ` : ''}

        <!-- Mobile Navigation Overlay (Unified Menu) -->
        <div class="mobile-nav-overlay" id="mobileNavOverlay">
            ${store.currentUser ? `
            <div class="mobile-nav-item" onclick="window.location.href='/profile.html?u=${store.currentUser.username}'; window.toggleMobileNav();">
                <i>👤</i> MI PERFIL
            </div>
            <div class="mobile-nav-item" onclick="window.openCreate(); window.toggleMobileNav();">
                <i>🚀</i> COMPARTIR PROMPT
            </div>
            <div class="mobile-nav-divider"></div>
            <div class="mobile-nav-item" onclick="window.location.href='/'">
                <i>🏠</i> VOLVER AL CREADOR (HOME)
            </div>
            <div class="mobile-nav-divider"></div>
            <div class="mobile-nav-item" onclick="window.doLogout(); window.toggleMobileNav();" style="color:#ff6b6b">
                <i>🚪</i> SALIR O CERRAR SESIÓN
            </div>
            ` : ''}
        </div>

        <div class="search-mobile-overlay">
            <div class="container" style="display:flex; flex-direction:column; gap:10px; height:100%; padding-top:20px">
                <div style="display:flex; align-items:center; gap:10px; width:100%">
                    <button class="btn-icon" onclick="document.querySelector('.search-mobile-overlay').classList.remove('active')" style="font-size:1.2rem; color:#fff">✕</button>
                    <div class="search-bar" style="flex:1; max-width:none; position:relative">
                        <input type="password" style="display:none" autocomplete="new-password">
                        <input type="text" class="search-input" id="searchMobileInput" placeholder="Buscar en perfil..." value="${searchQuery}" autocomplete="chrome-off-v2" spellcheck="false" name="mgprof_find" oninput="if(window.handleSearchTyping) window.handleSearchTyping(this.value)" onkeydown="if(event.key === 'Enter'){ window.handleSearch(this.value); document.querySelector('.search-mobile-overlay').classList.remove('active'); }">
                    </div>
                </div>
                <div id="search-mobile-suggestions-mount" style="flex:1; overflow-y:auto; margin-top:10px"></div>
            </div>
        </div>
    </header> `;

const ProfileHeader = () => {
    console.log(`[PROFILE] ProfileHeader: profileUser = "${profileUser}"`);
    if (!profileUser) return '';
    const target = profileUser.toLowerCase();
    let user = (store.currentUser && (store.currentUser.username?.toLowerCase() === target || store.currentUser.name?.toLowerCase() === target))
        ? store.currentUser
        : (store.users.find(u => u.username?.toLowerCase() === target || u.name?.toLowerCase() === target) || store.usersCache[target]);

    console.log(`[PROFILE] ProfileHeader: user encontrado ? `, user ? user.username : 'NO');
    console.log(`[DEBUG_ADMIN] CurrentUserRole: `, store.currentUser?.role);
    console.log(`[DEBUG_ADMIN] ProfileUserRole: `, user?.role);

    if (!user) {
        // Si ya pasó un tiempo razonable y sigue sin cargar, asumimos error
        if (window.initDone) {
            return `
    <div style = "height:40vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; font-family:sans-serif" >
                 <div style="font-size:3rem">🤷‍♂️</div>
                 <p style="margin-top:20px; letter-spacing:1px; font-size:0.9rem">USUARIO NO ENCONTRADO</p>
                 <button class="btn-outline" onclick="window.location.href='/'" style="margin-top:20px">Volver al Inicio</button>
             </div> `;
        }
        return `
    <div style = "height:40vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; font-family:sans-serif" >
            <div style="font-size:3rem; animation: pulse 1s infinite">✨</div>
            <p style="margin-top:20px; letter-spacing:1px; font-size:0.9rem">CARGANDO PERFIL...</p>
        </div> `;
    }

    const isAdmin = user.role === 'admin' || user.username === 'rodrigodlmoral' || user.username === 'rodridomrock' || user.name === 'rodrigodlmoral';
    const isMe = store.currentUser && store.currentUser.id === user.id;

    console.log(`[DEBUG_ADMIN] Final isAdmin check: `, isAdmin);
    console.log(`[DEBUG_ADMIN] user object keys: `, Object.keys(user));

    const getLevelInfo = (lvl) => LEVEL_REQS[lvl] || LEVEL_REQS[0];
    const lvlInfo = getLevelInfo(user.level || 0);

    return `
    <div class="profile-header-redesign">
        <div class="container profile-content">
            <!-- Left: Avatar -->
            <div class="profile-avatar-xl" style="background-image:url('${user.avatar || 'https://robohash.org/' + user.username}')"></div>
            
            <!-- Right: Info -->
            <div class="profile-info">
                
                <!-- Row 1: Name + Level -->
                <div class="profile-name-row">
                    <h1 class="profile-username">${window.escapeHTML(user.username)}</h1>
                    
                    <!-- Level Badge -->
                    <span class="level-badge tier-${user.level || 0}"
                        title="${isMe ? 'Haz clic para ver tu progreso' : 'Nivel ' + (user.level || 0)}"
                        style="${isMe ? 'cursor:pointer' : ''}"
                        ${isMe ? 'onclick="window.openLevelProgress()"' : ''}>
                        ${lvlInfo.icon} NIVEL ${user.level || 0}
                    </span>
                </div>

                <!-- Row 2: Unique Badges -->
                <div class="badge-container">
                    ${(user.unique_badges || []).map(badgeText => {
        let badgeClass = 'badge-blue'; // Default Standard
        const upper = badgeText.toUpperCase();

        // 1. GOLD / PREMIUM GLASS (Fundador, CEO, Creador)
        if (upper.includes('FUNDADOR') || upper.includes('C.E.O') || upper.includes('CREADOR')) {
            badgeClass = 'badge-gold';
        }
        // 2. PURPLE / VIP GLASS
        else if (upper.includes('V.I.P') || upper.includes('VIP')) {
            badgeClass = 'badge-purple';
        }
        // 3. RED / OFFICIAL
        else if (upper.includes('MODERADOR') || upper.includes('ADMIN') || upper.includes('STAFF')) {
            badgeClass = 'badge-red';
        }

        // Icono según tipo
        let icon = '🎖️';
        if (upper.includes('C.E.O') || upper.includes('ADMIN')) icon = '👑';
        if (upper.includes('FUNDADOR')) icon = '✨';
        if (upper.includes('CREADOR')) icon = '🎨';
        if (upper.includes('V.I.P')) icon = '💎';
        if (upper.includes('MODERADOR')) icon = '🛡️';
        if (upper.includes('VERIFICADO')) icon = '✅';

        return `
                            <div class="unique-badge ${badgeClass}">
                                <span>${icon} ${window.escapeHTML(badgeText)}</span>
                            </div>
                        `;
    }).join('')}
                </div>

                <!-- Row 3: Stats -->
                <div class="profile-stats-row">
                    <div class="profile-stat-item" title="PromptBits (Moneda oficial)" ${!isMe ? `onclick="window.openDirectTip('${user.id}', '${user.username}')" style="cursor:pointer"` : ''}>
                        <span>💎</span> <span class="profile-stat-value">${user.tokens || 0}</span> PromptBits
                    </div>
                    ${store.currentUser?.username === 'rodrigodlmoral' ? `<span style="opacity:0.3">|</span>` : ''} 
                    <div class="profile-stat-item">
                        <span class="profile-stat-value">${user.followers?.length || 0}</span> Seguidores
                    </div>
                    <span style="opacity:0.3">|</span>
                    <div class="profile-stat-item">
                        <span class="profile-stat-value">${user.following?.length || 0}</span> Siguiendo
                    </div>
                </div>

                <!-- Row 4: Socials + Actions -->
                <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; flex-wrap:wrap; gap:20px margin-top:10px">
                    
                    <!-- Socials -->
                    <div style="display:flex; gap:15px; align-items:center;">
                         ${user.socials ? `
                            ${user.socials.ig ? `<a href="${user.socials.ig.startsWith('http') ? user.socials.ig : 'https://instagram.com/' + user.socials.ig.replace('@', '')}" target="_blank" title="Instagram" style="text-decoration:none; width:22px; height:22px; opacity:0.8; transition:0.2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8">
                                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>` : ''}
                            ${user.socials.x ? `<a href="${user.socials.x.startsWith('http') ? user.socials.x : 'https://x.com/' + user.socials.x.replace('@', '')}" target="_blank" title="X / Twitter" style="text-decoration:none; width:20px; height:20px; opacity:0.8; transition:0.2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8">
                                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </a>` : ''}
                            ${user.socials.fb ? `<a href="${user.socials.fb.startsWith('http') ? user.socials.fb : 'https://facebook.com/' + user.socials.fb}" target="_blank" title="Facebook" style="text-decoration:none; width:22px; height:22px; opacity:0.8; transition:0.2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8">
                                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </a>` : ''}
                        ` : ''}
                    </div>

                    <!-- Actions Buttons -->
                    <div class="profile-actions">
                        ${!isMe ?
            `<button class="btn" onclick="window.doFollow('${user.name || user.id}')" style="min-width:120px">${store.currentUser?.following?.includes(user.id) ? 'Siguiendo' : 'Seguir'}</button>`
            :
            `
                            <button class="btn-glass" onclick="window.openSettings()">⚙️ Editar Perfil</button>
                            ${(isMe && isAdmin) ? `<button class="btn-glass" id="btnAdminPanel" onclick="window.open('/admin.html', '_blank')" style="border-color:gold; color:gold;">👑 Admin</button>` : ''}
                            `
        }
                    </div>

                </div>

            </div>
        </div>

        <!-- Tabs Navigation inside Header -->
        <div class="container" style="margin-top:20px; display:flex; gap:25px; border-bottom:1px solid #333">
            <button class="profile-tab ${profileTab === 'creations' ? 'active' : ''}" onclick="window.setProfileTab('creations')">IMAGEN</button>
            <button class="profile-tab ${profileTab === 'text' ? 'active' : ''}" onclick="window.setProfileTab('text')">TEXTO</button>
            ${isMe ? `<button class="profile-tab ${profileTab === 'saved' ? 'active' : ''}" onclick="window.setProfileTab('saved')">GUARDADOS</button>` : ''}
            ${isMe ? `<button class="profile-tab ${profileTab === 'marketplace' ? 'active' : ''}" onclick="window.setProfileTab('marketplace')">MARKETPLACE</button>` : ''}
            ${isMe ? `<button class="profile-tab ${profileTab === 'economy' ? 'active' : ''}" onclick="window.setProfileTab('economy')">ECONOMÍA</button>` : ''}
            ${isMe ? `<button class="profile-tab ${profileTab === 'referrals' ? 'active' : ''}" onclick="window.setProfileTab('referrals')" style="color:var(--accent);">👥 REFERIDOS</button>` : ''}
        </div>
    </div> `;
};

const Gallery = () => {
    const target = profileUser.toLowerCase();
    const user = (store.currentUser && (store.currentUser.username?.toLowerCase() === target || store.currentUser.name?.toLowerCase() === target))
        ? store.currentUser
        : (store.users.find(u => u.username?.toLowerCase() === target || u.name?.toLowerCase() === target) || store.usersCache[target]);

    if (!user) return '<div class="container" style="padding:40px 0; color:#666">Cargando galería...</div>';

    console.log(`[GALLERY_DEBUG] store.prompts.length = ${store.prompts.length}`);
    console.log(`[GALLERY_DEBUG] profileTab = ${profileTab}`);

    let list = [...store.prompts].filter(p => {
        const isMine = p.author_id === user.id;
        if (p.is_private && (!store.currentUser || store.currentUser.id !== p.author_id)) return false;

        // Scope Check (Creations vs Saved)
        const inScope = profileTab === 'creations' ? isMine : p.savedBy?.includes(user.id);

        if (!inScope) return false;

        // Apply Filters (Sync with main.js logic)
        if (filters.tools.length > 0 && !filters.tools.includes(p.tool)) return false;
        if (filters.ratings.length > 0 && !filters.ratings.includes(p.rating)) return false;
        if (filters.refFilter === 'withRef' && !p.needs_reference) return false;
        if (filters.refFilter === 'noRef' && p.needs_reference) return false;
        if (filters.tags.length > 0 && !(p.tags || []).some(t => filters.tags.includes(t))) return false;

        if (filters.time !== 'all') {
            const now = Date.now();
            const ms = { today: 86400000, week: 604800000, month: 2592000000 };
            const pTime = p.createdAt; // Unified field in store-final.js
            if (!pTime || (now - pTime > ms[filters.time])) return false;
        }

        return true;
    });

    console.log(`[GALLERY_DEBUG] filtered list.length = ${list.length}`);

    // Sort Logic (Default: newest first)
    list.sort((a, b) => {
        if (filters.sort === 'popular') {
            const getScore = (p) => Object.values(p.reactions || {}).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
            return getScore(b) - getScore(a);
        } else if (filters.sort === 'oldest') {
            return (a.createdAt || 0) - (b.createdAt || 0);
        } else if (filters.sort === 'commented') {
            return (b.comments?.length || 0) - (a.comments?.length || 0);
        }
        // Default: newest
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const isVisitor = !store.currentUser;
    // La galería ahora usa store.prompts (los cargados incrementalmente)
    const itemsToShow = isVisitor ? list.slice(0, 12) : list;

    if (list.length === 0) {
        console.warn(`[GALLERY_DEBUG] 🚨 La lista final es 0! user.id=${user.id}, store.prompts.length=${store.prompts.length}`);
        return `<div class="container" style="padding:100px; text-align:center; color:#666">No hay prompts que coincidan con los filtros.</div>`;
    }

    return `
    <div class="container gallery-grid" id="gallery-root" style="margin-top:20px">
        ${itemsToShow.map(p => {
        const { applyBlur, warningLabel } = getModeration(p);
        const reactions = p.reactions || { like: 0 };
        return `
            <div class="card">
                <div class="card-img-wrap ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" data-warning="${applyBlur ? warningLabel : ''}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
                </div>
                <div class="card-overlay" data-post-id="${p.id}" style="cursor:pointer">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:5px">${window.escapeHTML(p.title)}</div>
                    <div style="font-size:0.8rem; opacity:0.8; margin-bottom:10px">por @${window.escapeHTML(p.author)}</div>
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
                ${(store.currentUser?.username === profileUser && p.author === store.currentUser?.username) ? `
                <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doEditPrompt('${p.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doDeletePrompt('${p.id}')" title="Eliminar Post">🗑️</button>
                </div>` : ''}
            </div>`;
    }).join('')}
    </div> 
    
    <!-- BOTÓN DE CARGA MANUAL (MISMO SISTEMA QUE DASHBOARD) -->
    ${(!isVisitor && store.hasMore) ? `
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
                <span id="loading-spinner-sentinel" style="display:none; width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                <span>Cargar más contenido</span>
            </button>
        </div>
    ` : ''}

    ${(!isVisitor && !store.hasMore && list.length > 30) ? `
        <div class="end-of-gallery" style="text-align:center; padding: 60px 0;">
            <div id="sentinel-visual" style="color:#666">
                <div style="padding:40px 20px; background:rgba(255,255,255,0.05); border-radius:20px; border:1px dashed rgba(255,255,255,0.2); max-width:400px; margin:0 auto;">
                    <div style="font-size:2.5rem; margin-bottom:15px">🏁</div>
                    <div style="font-weight:800; font-size:1.2rem; color:#fff; margin-bottom:10px">¡Has llegado al final!</div>
                    <div style="color:#888; font-size:0.9rem; line-height:1.5">
                        Estás viendo todos los posts de @${profileUser}.
                    </div>
                </div>
            </div>
        </div>
    ` : ''}
    
    ${isVisitor ? `
    <div class="container" style="margin-top: 40px; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 2px solid var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🔓</div>
            <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Desbloquea toda la galería!</h2>
            <p style="color: #888; font-size: 1.1rem; margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
                Has visto los 12 prompts más recientes de @${profileUser}. Regístrate gratis para acceder a toda la colección, guardar tus favoritos y compartir tus propias creaciones.
            </p>

            <!-- Stats Bar -->
            <div style="display: flex; gap: 30px; justify-content: center; margin-bottom: 35px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="text-align: center;">
                    <div id="visStatsUsers" style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.users.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">👤 Usuarios</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div id="visStatsPrompts" style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.prompts.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">🖼️ Prompts</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
                <div style="text-align: center;">
                    <div id="visStatsVisits" style="font-size: 1.5rem; font-weight: 800; color: #fff;">${store.stats.visits.toLocaleString()}</div>
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
    ` : ''}
    `;
};

const TextGallery = () => {
    if (profileTextPrompts.length === 0) {
        return `<div class="container" style="padding:100px; text-align:center; color:#666">
            <div style="font-size:3rem; margin-bottom:15px">📝</div>
            <p>No hay prompts de texto aún.</p>
        </div>`;
    }

    return `
    <div class="container" style="margin-top:20px">
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
            ${profileTextPrompts.map(p => {
        const authorUsername = p.expand?.author?.username || p.author_name || p.author || 'Usuario';
        const reactions = p.reactions || {};
        const totalReactions = Object.values(reactions).reduce((sum, v) => typeof v === 'number' ? sum + v : sum, 0);
        const isMe = store.currentUser && (store.currentUser.username === authorUsername || store.currentUser.id === p.author);
        return `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid #222; border-radius: 16px; padding: 25px; cursor:pointer; transition: all 0.3s ease; position:relative;"
                     onmouseover="this.style.borderColor='var(--accent)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 30px rgba(168,85,247,0.15)';"
                     onmouseout="this.style.borderColor='#222'; this.style.transform='none'; this.style.boxShadow='none';"
                     onclick="window.openTextDetail('${p.id}')">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <span style="font-size:0.65rem; color:#a855f7; font-weight:800; text-transform:uppercase; letter-spacing:1px; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.2); padding:3px 8px; border-radius:10px;">${window.escapeHTML(p.category || 'General')}</span>
                        ${p.is_private ? '<span style="font-size:0.65rem; color:#ef4444; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); padding:3px 8px; border-radius:10px;">🔒 Privado</span>' : ''}
                    </div>

                    <h3 style="margin:0 0 8px 0; font-size:1.15rem; color:#fff; font-weight:700;">${window.escapeHTML(p.title || 'Sin título')}</h3>
                    <p style="color:#94a3b8; font-size:0.85rem; line-height:1.5; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${window.escapeHTML(p.description || p.prompt_text?.substring(0, 120) || '')}</p>
                    
                    <div style="display:flex; gap:12px; font-size:0.78rem; color:#666; flex-wrap:wrap;">
                        ${p.tool ? `<span style="color:var(--accent)">🛠 ${window.escapeHTML(p.tool)}</span>` : ''}
                        <span>📋 ${p.copy_count || 0} copias</span>
                        ${totalReactions > 0 ? `<span>💜 ${totalReactions} reacciones</span>` : ''}
                        ${p.comments?.length ? `<span>💬 ${p.comments.length}</span>` : ''}
                    </div>

                    ${isMe ? `
                    <div style="position:absolute; top:12px; right:12px; display:flex; gap:5px; z-index:10;">
                        <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:28px; height:28px; font-size:0.8rem" onclick="event.stopPropagation(); window.doDeleteTextPromptFromProfile('${p.id}')" title="Eliminar">🗑️</button>
                    </div>` : ''}
                </div>`;
    }).join('')}
        </div>
    </div>`;
};

// --- ACTION FUNCTIONS ---
window.doEditPrompt = (id) => {
    isEditing = true;
    editingId = id;
    const p = store.prompts.find(x => String(x.id) === String(id));
    if (!p) return;

    // Reuse Create Modal
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('upTitle').value = p.title;
    document.getElementById('upTool').value = p.tool;
    document.getElementById('upRating').value = p.rating || 'SFW / Apto';
    document.getElementById('upPrompt').value = p.prompt || '';
    if (document.getElementById('upNegPrompt')) {
        document.getElementById('upNegPrompt').value = p.negative_prompt || '';
    }
    document.getElementById('upPrivate').checked = p.isPrivate;
    document.getElementById('upReference').checked = p.needsReference || p.needs_reference;

    // Load Tags
    window.selectedTags = new Set(p.tags || []);
    window.renderTagSelector();

    // Handle Type
    if (p.type === 'sequence') {
        document.querySelector('input[name="postType"][value="sequence"]').checked = true;
        window.togglePostType('sequence');
        const container = document.getElementById('seqContainer');
        container.innerHTML = '';
        seqStepCount = 0;
        if (p.content) {
            p.content.forEach(step => {
                window.addSeqStep();
                const lastStep = container.lastElementChild;
                lastStep.querySelector('.seqPrompt').value = step.prompt;
                lastStep.querySelector('.seqRating').value = step.rating;
                const fileInput = lastStep.querySelector('.seqFile');
                const prev = document.createElement('div');
                prev.innerHTML = `<small > Imagen actual guardada.</small> <br><img src="${step.image}" style="height:50px; border:1px solid #444; margin-top:5px">`;
                fileInput.parentElement.insertBefore(prev, fileInput);
            });
        }
    } else {
        document.querySelector('input[name="postType"][value="single"]').checked = true;
        window.togglePostType('single');
        const fileInput = document.getElementById('upFile');
        const existingPrev = fileInput.parentElement.querySelector('.edit-preview');
        if (existingPrev) existingPrev.remove();
        const prev = document.createElement('div');
        prev.className = 'edit-preview';
        prev.innerHTML = `<div style="margin:10px 0"><small>Imagen actual:</small><br><img src="${p.image}" style="max-height:100px; border:1px solid #555"></div>`;
        fileInput.parentElement.insertBefore(prev, fileInput);
    }

    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.innerText = "Actualizar";
        btn.onclick = window.doUpdate;
    }
};

window.doUpdate = async () => {
    try {
        const title = document.getElementById('upTitle').value;
        const tool = document.getElementById('upTool').value;
        if (!title) { if (window.toast) window.toast("El título es obligatorio", "error"); return; }

        const p = store.prompts.find(x => String(x.id) === String(editingId));
        if (!p) return;

        const data = {
            title, tool, rating: document.getElementById('upRating').value,
            prompt: document.getElementById('upPrompt').value,
            negative_prompt: document.getElementById('upNegPrompt')?.value || '',
            isPrivate: document.getElementById('upPrivate').checked,
            needsReference: document.getElementById('upReference').checked,
            type: p.type,
            tags: Array.from(window.selectedTags), // NUEVO
            content: p.content || []
        };

        // Si es secuencia, recolectar datos de los pasos (v16)
        if (p.type === 'sequence') {
            const steps = [];
            document.querySelectorAll('#seqContainer .seq-card').forEach((card, idx) => {
                steps.push({
                    prompt: card.querySelector('.seqPrompt').value,
                    rating: card.querySelector('.seqRating').value,
                    image: p.content[idx]?.image || '' // Mantenemos la imagen actual si no se sube una nueva (la lógica de subida se maneja en el reader si aplica, pero para edición simple de texto esto basta)
                });
            });
            data.content = steps;
        }

        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Guardando...";

        if (p.type === 'single') {
            const file = document.getElementById('upFile').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                    data.image = reader.result;
                    const res = await store.updatePrompt(editingId, data);
                    if (res.success) finishUpdate();
                    else if (window.toast) window.toast("Error: " + res.msg, "error");
                };
                reader.readAsDataURL(file);
            } else {
                data.image = p.image;
                const res = await store.updatePrompt(editingId, data);
                if (res.success) finishUpdate();
                else if (window.toast) window.toast("Error: " + (res.msg || "Error desconocido"), "error");
            }
        } else {
            // EDICIÓN DE SECUENCIAS HABILITADA (v16.1)
            // Nota: Por ahora solo permite editar el texto de los pasos. 
            // Para cambiar imágenes de pasos, se requiere lógica iterativa de FileReader (futuro).
            const res = await store.updatePrompt(editingId, data);
            if (res.success) finishUpdate();
            else if (window.toast) window.toast("Error: " + (res.msg || "Error en secuencia"), "error");
        }
    } catch (e) { console.error(e); }
};

const finishUpdate = () => {
    if (window.toast) window.toast("✅ Post actualizado", "success");
    isEditing = false;
    editingId = null;
    window.closeModals();
    render();
    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.innerText = "Publicar";
        btn.onclick = window.doPublish;
    }
};

window.doDeletePrompt = async (id) => {
    if (await window.askConfirm('¿Eliminar este post permanentemente?', '🗑️')) {
        const res = await store.removePrompt(id);
        if (res.success) {
            if (id === currentId) window.closeModals();
            render();
        } else {
            alert(res.msg);
        }
    }
};

window.doPromotePrompt = async (id) => {
    if (await window.askConfirm('¿Destacar este prompt por 1 semana (Costo: 50 PromptBits)?', '💎')) {
        const res = await store.promotePrompt(id);
        if (res.success) {
            if (window.toast) window.toast("🚀 ¡Prompt destacado con éxito!", "success");
            render();
        } else {
            alert(res.msg);
        }
    }
};

window.doDeleteTextPromptFromProfile = async (id) => {
    if (!store.currentUser) return;
    if (confirm("¿Estás seguro de que quieres eliminar este prompt de texto? Esta acción no se puede deshacer.")) {
        try {
            await pb.collection('text_prompts').delete(id);
            // Remove from local array
            profileTextPrompts = profileTextPrompts.filter(p => p.id !== id);

            // Re-render gallery portion
            const galleryMount = document.getElementById('profile-gallery-container');
            if (galleryMount) galleryMount.innerHTML = TextGallery();

            if (window.toast) window.toast("✅ ¡Prompt eliminado!", "success");
        } catch (err) {
            console.error("Error deleting text prompt:", err);
            if (window.toast) window.toast("Error al eliminar el prompt", "error");
        }
    }
};

const DetailModalTemplateLocal = DetailModalTemplate;

const SettingsModal = () => {
    if (!store.currentUser) return '';
    const u = store.currentUser;
    const soc = u.socials || {};
    const mod = u.moderation || { suggestive: 'ON', nsfw: 'BLUR' };

    return `
        <div id="settingsModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
            <div class="modal-container" style="max-width:600px">
                <h2>Configuración de Perfil</h2>

                <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
                    <h3>👤 Cuenta</h3>
                    <div style="display:flex; gap:20px; align-items:center; margin-bottom:15px">
                        <div class="user-avatar-lg" id="previewAvatar" style="width:80px; height:80px; background-image:url('${u.avatar || 'https://robohash.org/' + u.username}')"></div>
                        <div>
                            ${(store.checkLevelFeature('avatar').hasAccess) ? `
                    <button class="btn-outline" onclick="document.getElementById('setAvatarFile').click()">Cambiar Foto</button>
                    ` : `
                    <span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:6px 12px; border-radius:4px; font-size:0.8rem; font-weight:700; border:1px solid rgba(255,165,0,0.3); cursor:not-allowed" title="${store.checkLevelFeature('avatar').message}">🔒 LVL 2 Requerido</span>
                    `}
                            <input type="file" id="setAvatarFile" accept="image/*" style="display:none" onchange="window.previewAvatar(this)">
                        </div>
                    </div>

                    <label class="form-label">Nombre de Usuario</label>
                    <input type="text" id="setUser" class="form-input" value="${u.username}">

                        <div style="margin-top:15px; padding:15px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
                            <button class="btn-outline" onclick="document.getElementById('passSec').style.display = document.getElementById('passSec').style.display === 'none' ? 'block' : 'none'" style="width:100%; text-align:left; display:flex; justify-content:space-between; align-items:center; border:none; padding:10px 0">
                                <span style="font-weight:700">🔒 Cambiar Contraseña</span>
                                <span>▼</span>
                            </button>
                            <div id="passSec" style="display:none; margin-top:15px">
                                <label class="form-label" style="font-size:0.75rem; color:#888">CONTRASEÑA ACTUAL</label>
                                <div style="position:relative; margin-bottom:12px">
                                    <input type="password" id="oldPassInput" class="form-input" placeholder="Tu clave vigente" style="padding-right:40px">
                                    <span onclick="window.togglePass('oldPassInput', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                                </div>

                                <label class="form-label" style="font-size:0.75rem; color:#888">NUEVA CONTRASEÑA</label>
                                <div style="position:relative; margin-bottom:15px">
                                    <input type="password" id="newPassInput" class="form-input" placeholder="Mínimo 6 caracteres" style="padding-right:40px">
                                    <span onclick="window.togglePass('newPassInput', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                                </div>
                                <button class="btn" id="btnUpdatePass" onclick="window.doChangePassword()" style="width:100%; background:linear-gradient(90deg, #d32f2f, #b71c1c); font-weight:800">Actualizar Contraseña</button>
                            </div>
                        </div>

                </div>

                <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333; position:relative">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                        <h3 style="margin:0">🌐 Redes Sociales</h3>
                        ${(store.checkLevelFeature('socials').hasAccess) ? '' : `<span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:700; border:1px solid rgba(255,165,0,0.3)">🔒 LVL 2 Requerido</span>`}
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'opacity:0.3; pointer-events:none; filter:grayscale(1)'}">
                        <div>
                            <label class="form-label">Instagram</label>
                            <input type="text" id="setIg" class="form-input" placeholder="@usuario" value="${soc.ig || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label class="form-label">Facebook</label>
                            <input type="text" id="setFb" class="form-input" placeholder="URL o usuario" value="${soc.fb || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label class="form-label">X / Twitter</label>
                            <input type="text" id="setX" class="form-input" placeholder="@usuario" value="${soc.x || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label class="form-label">Telegram Channel</label>
                            <input type="text" id="setTg" class="form-input" placeholder="t.me/canal" value="${soc.tg || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label class="form-label">Threads</label>
                            <input type="text" id="setTh" class="form-input" placeholder="@usuario" value="${soc.th || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                        <div>
                            <label class="form-label">Fanvue</label>
                            <input type="text" id="setFv" class="form-input" placeholder="URL Completa" value="${soc.fv || ''}" ${(store.checkLevelFeature('socials').hasAccess) ? '' : 'disabled'}>
                        </div>
                    </div>
                </div>

                <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
                    <h3>🛡️ Moderación de Contenido</h3>

                    <div style="margin-bottom:15px">
                        <label class="form-label">Contenido Sugestivo</label>
                        <select id="setModSugg" class="form-input">
                            <option value="ON" ${mod.suggestive === 'ON' ? 'selected' : ''}>Mostrar</option>
                            <option value="BLUR" ${mod.suggestive === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                        </select>
                    </div>

                    <div>
                        <label class="form-label">Contenido NSFW / +18</label>
                        <select id="setModNsfw" class="form-input">
                            <option value="ON" ${mod.nsfw === 'ON' ? 'selected' : ''}>Mostrar</option>
                            <option value="BLUR" ${mod.nsfw === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                            <option value="OFF" ${mod.nsfw === 'OFF' ? 'selected' : ''}>Apagar (No mostrar)</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section" style="margin-bottom:20px; background:#331111; padding:15px; border-radius:8px; border:1px solid #ff4444">
                    <h3 style="color:#ff4444; margin-top:0">⚠️ Zona de Peligro</h3>
                    <p style="font-size:0.9rem; color:#faa">Esta acción es irreversible. Se borrarán todos tus posts y datos.</p>
                    <button class="btn-outline" onclick="window.doDeleteAccount()" style="border-color:#ff4444; color:#ff4444; width:100%">ELIMINAR MI CUENTA</button>
                </div>

                <div style="display:flex; gap:10px">
                    <button class="btn" onclick="window.saveSettings()" style="flex:1">Guardar Cambios</button>
                    <button class="btn-outline" onclick="window.closeModals()" style="flex:1">Cancelar</button>
                </div>
            </div>
        </div>`;
};

const CreateModal = () => `
        <div id="createModal" class="modal-overlay" style="display:none;"><div class="modal-container">
            <h2>Compartir Prompt</h2>

            <div class="form-group">
                <label class="form-label">Tipo de Prompt</label>
                <div style="display:flex; gap:15px; margin-bottom:20px">
                    <label class="chk-wrap">
                        <input type="radio" name="postType" value="single" checked onchange="window.togglePostType('single')">
                            <span>Sencillo (1 imagen)</span>
                    </label>
                    <label class="chk-wrap">
                        <input type="radio" name="postType" value="sequence" onchange="window.togglePostType('sequence')">
                            <span>Secuencia (Múltiples) <small style="color:var(--accent); font-weight:bold">[Nivel 2+]</small></span>
                    </label>
                </div>
            </div>

            <form autocomplete="off" onsubmit="return false;" style="display:contents">
                <input type="text" name="fakeusernameremembered" style="display:none" autocomplete="username">
                    <input type="password" name="fakepasswordremembered" style="display:none" autocomplete="current-password">

                        <input type="text" id="upTitle" class="form-input" placeholder="Título" style="margin-bottom:15px" autocomplete="off" name="post_title_unique_id">

                            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px">
                                <label class="form-label" style="font-size:0.75rem; color:#666">HERRAMIENTA</label>
                                <select id="upTool" class="form-input" style="margin:0" onchange="window.checkToolConfig()">${TOOLS.map(t => `<option value='${t}'>${t}</option>`).join('')}</select>
                            </div>

                            <div id="upExtraConfig" style="display:none; background:#111; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #222">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                                    <span style="font-size:0.8rem; font-weight:bold; color:var(--accent)">CONFIGURACIÓN ADICIONAL</span>
                                    <button class="btn-icon" onclick="window.addExtraRow()" style="background:var(--accent); width:24px; height:24px; font-size:1.2rem; display:flex; align-items:center; justify-content:center">+</button>
                                </div>
                                <div id="extraRowsContainer"></div>
                            </div>

                            <div id="singleFields">
                                <div style="display:flex; align-items:center; margin-bottom:15px">
                                    <select id="upRating" class="form-input" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
                                    ${INFO_ICON}
                                </div>
                                <input type="file" id="upFile" class="form-input" accept="image/*" style="margin-bottom:15px" onchange="window.previewFile(this, 'singlePreview')">
                                    <div id="singlePreview" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:15px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
                                        <img src="" style="max-width:100%; max-height:350px; display:block; border-radius:4px">
                                    </div>
                                    <label class="form-label" style="font-size:0.75rem; color:#666">PROMPT</label>
                                    <textarea id="upPrompt" class="form-input" placeholder="Prompt positivo..." rows="4" autocomplete="off" style="margin-bottom:10px"></textarea>

                                    <div style="display:flex; justify-content:center; margin-bottom:10px">
                                        <button class="btn-outline" onclick="window.toggleNeg('singleNeg')" style="padding:4px 12px; font-size:0.85rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
                                    </div>

                                    <div id="singleNeg" style="display:none; margin-bottom:15px">
                                        <label class="form-label" style="font-size:0.75rem; color:#ff4444">NEGATIVE PROMPT</label>
                                        <textarea id="upNegPrompt" class="form-input" placeholder="Lo que NO quieres en la imagen..." rows="3" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
                                    </div>
                            </div>

                            <div id="sequenceFields" style="display:none">
                                <div id="seqContainer"></div>
                                <button class="btn-outline" onclick="window.addSeqStep()" style="width:100%; margin-bottom:15px">+ Añadir Paso</button>
                            </div>

                            <div style="display:flex; flex-direction:column; gap:5px; margin:15px 0">
                                <label class="chk-wrap">
                                    <input type="checkbox" id="upReference" name="reference_chk_unique">
                                        <span>📸 Requiere imagen de referencia</span>
                                </label>
                                <label class="chk-wrap">
                                    <input type="checkbox" id="upPrivate" name="private_chk_unique">
                                        <span>🔒 Hacer privado (solo yo puedo verlo)</span>
                                </label>
                            </div>

                            <div id="tagSelectorRoot"></div>

                        </form>

                        <div style="display:flex; gap:10px">
                            <button class="btn" id="pubBtn" onclick="window.doPublish()" style="width:100%; margin-bottom:10px">Publicar</button>
                            <button class="btn-outline" onclick="window.closeModals()" style="width:100%">Cerrar</button>
                        </div>
                    </div></div>`;

const ConfirmModal = () => `
                <div id="confirmModal" class="modal-overlay" style="display:none; z-index:2147483647;"><div class="modal-container" style="max-width:400px; text-align:center">
                    <div id="confirmIcon" style="font-size:3rem; margin-bottom:15px">❓</div>
                    <div id="confirmText" style="font-size:1.1rem; margin-bottom:25px; line-height:1.5">¿Estás seguro?</div>
                    <div style="display:flex; gap:15px; justify-content:center">
                        <button class="btn btn-outline" style="flex:1" onclick="window.confirmResolve(false)">Cancelar</button>
                        <button class="btn" style="flex:1" onclick="window.confirmResolve(true)">Aceptar</button>
                    </div>
                </div></div>`;

const AuthModal = () => `
        <div id="authModal" class="modal-overlay" style="display:none;"> <div class="modal-container">
            <div id="loginForm">
                <h2>Entrar</h2>
                <input type="text" id="logUser" class="form-input" placeholder="Usuario o Email">
                    <div style="position:relative">
                        <input type="password" id="logPass" class="form-input" placeholder="Pass" style="padding-right:40px">
                            <span onclick="window.togglePass('logPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                    </div>
                    <button class="btn" style="width:100%" onclick="window.doLoginSubmit()">Login</button>
                    <p style="margin-top:10px; font-size:0.9em">
                        <a href="#" onclick="window.toggleAuth('rec')" style="color:#666">¿Olvidaste tu contraseña?</a>
                    </p>
                    <p>¿No tienes cuenta? <a href="#" onclick="window.toggleAuth('reg')">Regístrate</a></p>
            </div>
            <div id="regForm" style="display:none;">
                <h2>Registro</h2>
                <input type="text" id="regEmail" class="form-input" placeholder="Email">
                    <input type="text" id="regUser" class="form-input" placeholder="Usuario">
                        <div style="position:relative">
                            <input type="password" id="regPass" class="form-input" placeholder="Contraseña" style="padding-right:40px">
                                <span onclick="window.togglePass('regPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                        </div>
                        <button class="btn" style="width:100%" onclick="window.doRegisterSubmit()">Registrar</button>
                        <p>¿Ya tienes cuenta? <a href="#" onclick="window.toggleAuth('log')">Login</a></p>
                    </div>
                    <div id="recoverForm" style="display:none;">
                        <h2>Recuperar Pass</h2>
                        <p style="margin-bottom:15px; color:#888; font-size:0.85rem">Introduce tu email de registro:</p>
                        <input type="email" id="recEmail" class="form-input" placeholder="ejemplo@correo.com" style="margin-bottom:15px">
                            <button class="btn" style="width:100%" onclick="window.doRecoverSubmit()">Enviar Instrucciones</button>
                            <p style="margin-top:15px; font-size:0.9rem">
                                <a href="#" onclick="window.toggleAuth('log')" style="color:#666">Volver al Login</a>
                            </p>
                    </div>
                    <div id="activateForm" style="display:none;">
                        <h2>Activar Cuenta</h2>
                        <p style="margin-bottom:15px; color:#a29bfe; font-size:0.85rem; font-weight:700">¡Bienvenido! Elige tu nueva contraseña para activar tu perfil.</p>
                        <input type="text" id="actUser" class="form-input" placeholder="Usuario o Email">
                            <div style="position:relative">
                                <input type="password" id="actPass" class="form-input" placeholder="Nueva Contraseña" style="padding-right:40px">
                                    <span onclick="window.togglePass('actPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                            </div>
                            <button class="btn" style="width:100%" onclick="window.doActivateSubmit()">Activar y Entrar</button>
                    </div>
                    <button class="btn-outline" style="width:100%; border:none; margin-top:10px" onclick="window.closeModals()">Cancelar</button>
            </div></div>`;

const Modals = () => AuthModal() + CreateModal() + DetailModalTemplateLocal + ConfirmModal();


// --- LOGIC ---
// --- LOGIC ---
const render = () => {
    // Estrategia No-Destructiva: No sobrescribir todo el app.innerHTML si ya existe la estructura
    if (!document.getElementById('profile-gallery-container')) {
        app.innerHTML = `
            <div id="header-mount"></div>
            <div id="profile-header-mount"></div>
            <div id="economyDashboardContainer"></div>
            <div id="profile-gallery-container"></div>
            <div id="modals-mount"></div>
            <div id="adv-filter-mount"></div>
            ${CreateModal()}
            ${ConfirmModal()}
            ${AuthModal()}
            ${ActivityModal()}
        `;
        const modalsMount = document.getElementById('modals-mount');
        if (modalsMount) modalsMount.innerHTML = DetailModalTemplateLocal() + TextDetailModalTemplate();
    }

    // --- SAFE MODAL INJECTION ---
    if (store.currentUser) {
        const modalsMount = document.getElementById('modals-mount');
        if (modalsMount) {
            const settingsModal = document.getElementById('settingsModal');
            if (!settingsModal) {
                modalsMount.insertAdjacentHTML('beforeend', SettingsModal());
            } else if (settingsModal.style.display === 'none') {
                settingsModal.outerHTML = SettingsModal();
            }
        }
    }

    const headerMount = document.getElementById('header-mount');
    if (headerMount) headerMount.innerHTML = Header();

    const pHeaderMount = document.getElementById('profile-header-mount');
    if (pHeaderMount) pHeaderMount.innerHTML = ProfileHeader();

    // Economy Dashboard (own profile only)
    const targetNorm = profileUser.toLowerCase();
    const isOwnProfile = store.currentUser && (
        (store.currentUser.username || '').toLowerCase() === targetNorm ||
        (store.currentUser.name || '').toLowerCase() === targetNorm
    );
    const galleryMount = document.getElementById('profile-gallery-container');
    const ecoContainer = document.getElementById('economyDashboardContainer');

    if (galleryMount) {
        try {
            if (profileTab === 'marketplace') {
                galleryMount.innerHTML = MarketplaceTab(store);
                setTimeout(() => {
                    if (window.loadActiveBoosts) window.loadActiveBoosts();
                }, 100);
            } else if (profileTab === 'economy') {
                galleryMount.innerHTML = '';
            } else if (profileTab === 'referrals') {
                galleryMount.innerHTML = '<div id="referrals-wrapper"></div>';
                setTimeout(() => {
                    const targetNorm = profileUser.toLowerCase();
                    const u = (store.currentUser && (store.currentUser.username?.toLowerCase() === targetNorm || store.currentUser.name?.toLowerCase() === targetNorm))
                        ? store.currentUser
                        : (store.users.find(uu => uu.username?.toLowerCase() === targetNorm || uu.name?.toLowerCase() === targetNorm) || store.usersCache[targetNorm]);
                    if (u) ReferralsTab(u);
                }, 50);
            } else if (profileTab === 'text') {
                galleryMount.innerHTML = '<div class="container" style="padding:60px; text-align:center; color:#666"><div style="font-size:2rem; animation: pulse 1s infinite">📝</div><p style="margin-top:15px">Cargando prompts de texto...</p></div>';
                // Fetch text prompts for this user
                (async () => {
                    try {
                        const targetNorm = profileUser.toLowerCase();
                        const user = (store.currentUser && (store.currentUser.username?.toLowerCase() === targetNorm || store.currentUser.name?.toLowerCase() === targetNorm))
                            ? store.currentUser
                            : (store.users.find(u => u.username?.toLowerCase() === targetNorm || u.name?.toLowerCase() === targetNorm) || store.usersCache[targetNorm]);
                        if (!user) return;

                        const filter = `author = "${user.id}"`;
                        const result = await pb.collection('text_prompts').getList(1, 100, {
                            sort: '-id',
                            expand: 'author',
                            filter: filter
                        });
                        profileTextPrompts = result.items.map(item => ({
                            ...item,
                            author_name: item.expand?.author?.username || item.expand?.author?.name || 'Usuario'
                        }));
                        galleryMount.innerHTML = TextGallery();
                    } catch (err) {
                        console.error('Error loading text prompts for profile:', err);
                        galleryMount.innerHTML = `<div class="container" style="padding:60px; text-align:center; color:#ff4444"><p>Error al cargar prompts de texto: ${err.message}</p></div>`;
                    }
                })();
            } else {
                galleryMount.innerHTML = Gallery();
            }
        } catch (err) {
            console.error("❌ Component Render Error:", err);
            galleryMount.innerHTML = `<div class="container" style="padding:100px; text-align:center; color:#ff4444">
                <div style="font-size:3rem">⚠️</div>
                <h3>Error de Carga</h3>
                <p>Ocurrió un error al renderizar esta sección. Por favor, intenta de nuevo.</p>
                <code style="font-size:0.8rem; opacity:0.6">${err.message}</code>
            </div>`;
        }
    }

    // Advanced Filter Panel
    const advFilterMount = document.getElementById('adv-filter-mount');
    if (advFilterMount) advFilterMount.innerHTML = profileTab === 'economy' ? '' : AdvancedFilters(filters);

    attachEvents();

    if (isOwnProfile && profileTab === 'economy') {
        const ecoContainer = document.getElementById('economyDashboardContainer');
        if (ecoContainer) {
            ecoContainer.style.opacity = '0';
            ecoContainer.style.transform = 'translateY(10px)';
            ecoContainer.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            initEconomyDashboard('economyDashboardContainer');
            // Force reflow and animate
            setTimeout(() => {
                ecoContainer.style.opacity = '1';
                ecoContainer.style.transform = 'translateY(0)';
            }, 50);
        }
    } else {
        if (ecoContainer) ecoContainer.innerHTML = '';
    }

    // Solo scrollear arriba si no es un render incremental
    window._isIncrementalRender = false;
};
window.render = render;

// --- MOBILE NAVIGATION LOGIC ---
window.toggleMobileNav = () => {
    const nav = document.getElementById('mobileNavOverlay');
    if (nav) nav.classList.toggle('active');
};
// Close mobile nav when clicking outside
document.addEventListener('click', (e) => {
    const nav = document.getElementById('mobileNavOverlay');
    const btn = document.querySelector('.mobile-menu-btn');
    if (nav && nav.classList.contains('active')) {
        if (!nav.contains(e.target) && btn && !btn.contains(e.target)) {
            nav.classList.remove('active');
        }
    }
});
const attachEvents = () => {
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        if (window.handleSearchTyping) window.handleSearchTyping(e.target.value);
    });

    document.querySelectorAll('[data-post-id]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-post-id');
            window.openDetail(id);
        });
    });
};

// --- MASTER UNIFICATION WRAPPERS ---
window.openDetail = (id) => {
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;
    const { applyBlur } = window.getModeration(p);
    if (!store.currentUser && applyBlur) {
        if (window.toast) window.toast("⚠️ Regístrate para visualizar contenido +18", "error");
        else alert("Regístrate para visualizar contenido +18");
        return;
    }
    store.openDetail(id);
};
window.doReact = (type) => store.doReact(type);
window.prevSeqStep = () => store.prevSeqStep();
window.nextSeqStep = () => store.nextSeqStep();
window.revealImage = (btn) => store.revealImage(btn);
window.getModeration = (p, f) => store.getModeration(p, f);

window.openDetail = (id) => {
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;
    const { applyBlur } = window.getModeration(p);
    if (!store.currentUser && applyBlur) {
        if (window.toast) window.toast("⚠️ Regístrate para visualizar contenido +18", "error");
        else alert("Regístrate para visualizar contenido +18");
        return;
    }
    store.openDetail(id);
};

// Comment Logic wrappers
window.showSlider = () => store.showSlider();
window.initCrystalSlider = () => store.initCrystalSlider();
window.postComm = () => store.postComm();

window.togglePostType = (type) => {
    const isSequence = type === 'sequence';
    const effectiveLevel = store.getEffectiveLevel(store.currentUser);

    if (isSequence && effectiveLevel < 2) {
        if (window.toast) window.toast("⚠️ Función Bloqueda: Necesitas ser Nivel 2 o superior para subir secuencias.", "error");
        else alert("⚠️ Función Bloqueda: Necesitas ser Nivel 2 o superior para subir secuencias.");
        const singleRadio = document.querySelector('input[name="postType"][value="single"]');
        if (singleRadio) singleRadio.checked = true;
        return;
    }
    const sF = document.getElementById('singleFields');
    const qF = document.getElementById('sequenceFields');
    if (sF) sF.style.display = type === 'single' ? 'block' : 'none';
    if (qF) qF.style.display = type === 'sequence' ? 'block' : 'none';
    if (type === 'sequence' && seqStepCount === 0) {
        window.addSeqStep();
    }
};

window.toggleOptionsMenu = () => {
    const menu = document.getElementById('optionsMenu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.doSavePrompt = async () => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión para guardar.", "warning"); return; }
    await store.savePrompt(store.activePostId);
    render();
    window.toggleOptionsMenu();
    window.toast("Prompt Guardado", "success");
};

window.doCopyPrompt = async (type = 'main') => {
    const p = store.prompts.find(x => String(x.id) === String(store.activePostId));
    if (!p) return;

    let text = '';
    if (type === 'main') {
        text = p.type === 'sequence' ? p.content[store.currentSeqStep]?.prompt : p.prompt;
    } else {
        text = p.type === 'sequence' ? p.content[store.currentSeqStep]?.negative_prompt : p.negative_prompt;
    }

    if (!text) {
        window.toast("No hay texto para copiar", "warning");
        return;
    }

    await navigator.clipboard.writeText(text || '');

    if (type === 'main') {
        const res = await store.incrementCopyCount(store.activePostId);
        window.toast("¡Prompt Copiado!", "success");

        // Actualizar Badge si existe (Sincronización con DetailModal)
        const badge = document.getElementById('detCopyBadge');
        if (badge && res.success && res.count !== undefined) {
            badge.innerText = `📋 Copiado ${res.count} veces`;
        } else if (badge && res.selfCopy) {
            badge.innerText = `📋 Copiado ${p.copy_count || 0} veces`;
        }
    } else {
        window.toast("¡Negative Prompt Copiado!", "info");
    }

    // Track Event in GA4
    window.trackEvent('copy_prompt', {
        id: p.id,
        title: p.title,
        author: p.author,
        tool: p.tool,
        type: type
    });

    render();
};

window.doReportPrompt = () => { window.toast("Post Reportado", "info"); window.toggleOptionsMenu(); };
window.doHidePrompt = () => { window.toast("Post Oculto", "info"); window.toggleOptionsMenu(); };

window.doBlockUser = async () => {
    const p = store.prompts.find(x => String(x.id) === String(store.activePostId));
    if (!p) return;
    if (confirm(`¿Bloquear a @${p.author}?`)) {
        await store.blockUser(p.author);
        window.closeModals();
        render();
    }
};

// Eliminadas en favor de store.doReact
// window.doReact = ...

// window.initCrystalSlider = ... 

// Retirada, ahora se usa store.postComm() via wrapper arriba

window.openTip = (postId) => {
    if (!store.currentUser) { if (window.toast) window.toast("Inicia sesión para enviar propinas.", "warning"); return; }
    currentTipPostId = postId;
    const p = store.prompts.find(x => String(x.id) === String(postId));

    const existing = document.getElementById('dynamicTipModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = 999999;
    overlay.innerHTML = `
                <div class="modal-container" style="max-width:400px; text-align:center">
                    <div style="font-size:3rem; margin-bottom:10px">💎</div>
                    <h2>Enviar a @${p.author}</h2>
                    <p style="color:#888; margin-bottom:20px">Apoya el post "${p.title}"</p>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px">
                        <button class="btn-outline" onclick="window.doSendTip(5)">💎 5</button>
                        <button class="btn-outline" onclick="window.doSendTip(10)">💎 10</button>
                        <button class="btn-outline" onclick="window.doSendTip(20)">💎 20</button>
                        <button class="btn-outline" onclick="window.doSendTip(50)">💎 50</button>
                    </div>
                    <div style="font-size:0.85rem; margin-bottom:20px">Saldo: ${store.currentUser.tokens || 0} bits</div>
                    <button class="btn-outline" onclick="document.getElementById('dynamicTipModal').remove()">Cancelar</button>
                </div>`;
    document.body.appendChild(overlay);
};

window.doSendTip = async (amount) => {
    if (await window.askConfirm(`¿Enviar ${amount} bits?`, '💎')) {
        const res = await store.sendTip(currentTipPostId, amount);
        if (res.success) {
            window.toast("¡Enviado!", "success");
            const dtm = document.getElementById('dynamicTipModal');
            if (dtm) dtm.remove();
            store.openDetail(store.activePostId);
        } else {
            alert(res.msg);
        }
    }
};


let confirmResolver = null;
window.askConfirm = (msg, icon) => {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmText').innerText = msg;
        document.getElementById('confirmIcon').innerText = icon || '❓';
        modal.style.display = 'flex';
        confirmResolver = resolve;
    });
};

window.confirmResolve = (val) => {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmResolver) confirmResolver(val);
};

// No change needed for profile.js search yet as it uses the same header logic if shared, but they are separate files.
window.renderTagSelector = () => {
    const root = document.getElementById('tagSelectorRoot');
    if (!root) return;

    const selectedHTML = Array.from(window.selectedTags).length > 0
        ? Array.from(window.selectedTags).map(tag => `
                <button class="tag-chip selected" onclick="window.toggleTag('${tag}')">
                    ${tag} <span style="font-size:0.6rem; opacity:0.6">✕</span>
                </button>
                `).join('')
        : '<div style="color:#555; font-size:0.75rem; font-style:italic">Ninguna etiqueta seleccionada</div>';

    const categoriesHTML = Object.entries(TAG_CATEGORIES).map(([category, tags]) => `
                <div class="tag-category">
                    <div class="tag-category-header" onclick="window.toggleTagCategory('${category}')">
                        <span>${category}</span>
                        <span>${window.openCategory === category ? '▲' : '▼'}</span>
                    </div>
                    <div class="tag-category-content" id="cat-content-${category.replace(/\s+/g, '-')}" style="${window.openCategory === category ? 'display:flex' : 'display:none'}">
                        ${tags.map(tag => {
        const isSelected = window.selectedTags.has(tag);
        return `<button class="tag-chip ${isSelected ? 'selected' : ''}" onclick="window.toggleTag('${tag}')">${tag}</button>`;
    }).join('')}
                    </div>
                </div>
                `).join('');

    root.innerHTML = `
                <div class="tag-selector-container">
                    <div class="selected-tags-box">
                        <h4>Etiquetas Seleccionadas</h4>
                        <div class="selected-tags-list">${selectedHTML}</div>
                    </div>

                    <div class="tag-control-btns">
                        <button class="btn-tag-action ${window.showSearchUI ? 'active' : ''}" onclick="window.toggleSearchUI()">
                            🔍 Buscar Tags
                        </button>
                        <button class="btn-tag-action btn-auto-tag" id="autoTagBtn" onclick="window.doAutoTag()">
                            ✨ IA Auto-Tag
                        </button>
                    </div>

                    <div class="tag-search-field" style="${window.showSearchUI ? 'display:block' : 'display:none'}">
                        <input type="text" class="tag-search-input" placeholder="Escribe aquí para buscar..." onkeyup="window.filterTags(this.value)">
                            <div class="compact-category-list" style="display:block">
                                ${categoriesHTML}
                            </div>
                    </div>
                </div>
                `;
};

window.toggleSearchUI = () => {
    window.showSearchUI = !window.showSearchUI;
    window.renderTagSelector();
};

window.doAutoTag = async () => {
    const btn = document.getElementById('autoTagBtn');
    const isSequence = document.querySelector('input[name="postType"]:checked')?.value === 'sequence';
    let file;

    if (isSequence) {
        file = document.querySelector('.seq-card input[type="file"]')?.files[0];
    } else {
        file = document.getElementById('upFile')?.files[0];
    }

    if (!file) {
        window.toast('Por favor, selecciona una imagen primero', 'warning');
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '🪄 Analizando...';
        window.toast('IA analizando imagen...', 'info');

        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        const base64Image = await base64Promise;
        const ALL_TAGS = Object.values(TAG_CATEGORIES).flat();
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-001",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": `De la siguiente lista de etiquetas, elige las 3-5 más adecuadas para describir esta imagen. Devuelve ÚNICAMENTE un array JSON de strings: ${ALL_TAGS.join(', ')}`
                            },
                            {
                                "type": "image_url",
                                "image_url": { "url": `data:${file.type};base64,${base64Image}` }
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content || "";
        const match = aiContent.match(/\[.*\]/s);

        if (match) {
            const suggested = JSON.parse(match[0]);
            suggested.forEach(tag => {
                if (ALL_TAGS.includes(tag)) window.selectedTags.add(tag);
            });
            window.toast('✨ Sugerencias de IA añadidas', 'success');
            window.renderTagSelector();
        } else {
            throw new Error('Respuesta inválida de IA');
        }

    } catch (err) {
        console.error('Auto-Tag Error:', err);
        window.toast('Error con la IA', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ IA Auto-Tag';
    }
};

window.toggleTagCategory = (category) => {
    const id = `cat-content-${category.replace(/\s+/g, '-')}`;
    const content = document.getElementById(id);
    if (content) {
        const isClosed = content.style.display === 'none' || content.style.display === '';
        // Close all others
        document.querySelectorAll('.tag-category-content').forEach(el => el.style.display = 'none');
        // Toggle current
        content.style.display = isClosed ? 'flex' : 'none';
        window.openCategory = isClosed ? category : null;
    }
};

window.toggleTag = (tag) => {
    if (window.selectedTags.has(tag)) {
        window.selectedTags.delete(tag);
    } else {
        if (window.selectedTags.size >= 10) {
            window.toast("Máximo 10 etiquetas permitidas", "error");
            return;
        }
        window.selectedTags.add(tag);
    }
    // Re-render chips visual state only
    window.renderTagSelector();
};

window.filterTags = (query) => {
    const term = query.toLowerCase();
    const container = document.getElementById('tagCategoriesContainer');
    if (!container) return;

    if (!term) {
        window.renderTagSelector();
        return;
    }

    let resultsHTML = '';
    Object.entries(TAG_CATEGORIES).forEach(([category, tags]) => {
        const matches = tags.filter(t => t.toLowerCase().includes(term));
        if (matches.length > 0) {
            resultsHTML += `
                <div class="tag-category" style="margin-bottom:12px">
                    <div style="font-size:0.75rem; color:#666; margin-bottom:8px; margin-left:5px; text-transform:uppercase; font-weight:bold">${category}</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px">
                        ${matches.map(tag => {
                const isSelected = window.selectedTags.has(tag);
                return `<button class="tag-chip ${isSelected ? 'selected' : ''}" onclick="window.toggleTag('${tag}')">${tag}</button>`;
            }).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = resultsHTML || '<div style="color:#666; font-size:0.8rem; padding:10px">No se encontraron etiquetas.</div>';
};

window.openCreate = () => {
    if (!store.currentUser) {
        if (window.toast) window.toast("Debes iniciar sesión para compartir prompts.", "warning");
        window.location.href = '/';
        return;
    }
    seqStepCount = 0;
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.style.display = 'flex';
        // RESET TAGS for new post
        window.selectedTags.clear();
        window.renderTagSelector();
        // Reset single preview
        const sp = document.getElementById('singlePreview');
        if (sp) sp.style.display = 'none';
        // Reset sequence container
        const sc = document.getElementById('seqContainer');
        if (sc) sc.innerHTML = '';
        // Ensure single fields are visible by default
        window.togglePostType('single');
    }
};

// --- REPRODUCTOR DE CARGA MANUAL (BOTÓN) ---
const triggerLoadMore = async () => {
    if (store.isLoadingMore || !store.hasMore) return;

    const btn = document.getElementById('manual-load-btn');
    const visual = document.getElementById('sentinel-visual');
    if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    if (visual) visual.innerText = "⏳ Trayendo más contenido...";

    try {
        const target = profileUser.toLowerCase();
        const user = (store.currentUser && (store.currentUser.username?.toLowerCase() === target || store.currentUser.name?.toLowerCase() === target))
            ? store.currentUser
            : (store.users.find(u => u.username?.toLowerCase() === target || u.name?.toLowerCase() === target) || store.usersCache[target]);

        if (!user) return;

        // Filtro específico para el autor que estamos viendo
        const filter = `author = "${user.id}"`;
        const newItems = await store.loadPrompts(false, filter);

        if (newItems && newItems.length > 0) {
            console.log(`[PROFILE SCROLL] 💉 Inyectando ${newItems.length} items de forma quirúrgica.`);
            appendSurgicalPrompts(newItems);
        }
    } catch (err) {
        console.error("[PROFILE SCROLL] ❌ Fallo crítico:", err);
        if (visual) visual.innerText = "❌ Error al cargar";
    } finally {
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }

        const hasMore = store.hasMore;
        if (visual) visual.innerText = hasMore ? "MOSTRAR SIGUIENTES 60 POSTS" : "🏁 Fin de la galería";

        if (!hasMore && btn) {
            btn.style.display = 'none';
        }
    }
};

window.forceLoadMore = () => {
    if (!store.currentUser) {
        toast("Inicia sesión para ver más contenido", "info");
        return;
    }
    console.log("🛡️ Carga Manual Perfil Solicitada");
    triggerLoadMore();
};

const appendSurgicalPrompts = (newItems) => {
    const grids = document.querySelectorAll('.gallery-grid');
    let galleryRoot = grids.length > 0 ? grids[grids.length - 1] : document.getElementById('gallery-root');
    const sentinel = document.getElementById('scroll-sentinel');
    const parentContainer = galleryRoot?.parentElement || document.getElementById('profile-gallery-container');

    if (!galleryRoot) {
        console.error("[PROFILE SCROLL] No se encontró contenedor para inyección.");
        return;
    }

    // Usamos el conteo real de cards en el DOM para sincronizar
    let globalIdx = document.querySelectorAll('.card').length;

    console.log(`[PROFILE SCROLL] 🎯 Iniciando inyección quirúrgica desde índice global ${globalIdx}`);

    newItems.forEach((p) => {
        // Partimos el grid cada 12 (mismo sistema que main.js para consistencia)
        // Solo partimos si el grid actual ya tiene contenido, para evitar doble split
        if (globalIdx > 0 && globalIdx % 12 === 0 && galleryRoot.children.length > 0) {
            console.log(`[PROFILE SCROLL] 🏗️ Lote de 12 completado. Creando nuevo grid.`);

            const newGrid = document.createElement('div');
            newGrid.className = 'gallery-grid';
            newGrid.style.marginTop = '20px';

            if (sentinel) {
                parentContainer.insertBefore(newGrid, sentinel);
            } else {
                parentContainer.appendChild(newGrid);
            }
            galleryRoot = newGrid;
        }

        const temp = document.createElement('div');
        const { applyBlur, warningLabel } = getModeration(p);
        const reactions = p.reactions || { like: 0 };

        temp.innerHTML = `
            <div class="card">
                <div class="card-img-wrap ${applyBlur ? 'card-blurred' : ''}" data-post-id="${p.id}" data-warning="${applyBlur ? warningLabel : ''}" style="height:100%; cursor:pointer">
                    ${renderCollage(p)}
                </div>
                <div class="card-overlay" data-post-id="${p.id}" style="cursor:pointer">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:5px">${window.escapeHTML(p.title)}</div>
                    <div style="font-size:0.8rem; opacity:0.8; margin-bottom:10px">por @${window.escapeHTML(p.author)}</div>
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
                ${(store.currentUser?.username === profileUser && p.author === store.currentUser?.username) ? `
                <div style="position:absolute; top:10px; right:10px; display:flex; gap:5px; z-index:10;">
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doEditPrompt('${p.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" style="background:rgba(0,0,0,0.6); padding:5px; width:30px; height:30px; font-size:0.9rem" onclick="event.stopPropagation(); window.doDeletePrompt('${p.id}')" title="Eliminar Post">🗑️</button>
                </div>` : ''}
            </div>`;

        const cardNode = temp.firstElementChild;
        if (cardNode) galleryRoot.appendChild(cardNode);

        globalIdx++;
    });
};

window.togglePostType = (type) => {
    if (type === 'sequence' && (!store.currentUser || (store.currentUser.level || 0) < 1)) {
        alert("⚠️ Función Bloquedada: Necesitas ser Nivel 1 o superior para subir secuencias (aporta al menos 10 prompts sencillos).");
        const singleRadio = document.querySelector('input[name="postType"][value="single"]');
        if (singleRadio) singleRadio.checked = true;
        return;
    }
    document.getElementById('singleFields').style.display = type === 'single' ? 'block' : 'none';
    document.getElementById('sequenceFields').style.display = type === 'sequence' ? 'block' : 'none';
    if (type === 'sequence' && seqStepCount === 0) {
        window.addSeqStep();
    }
};

window.toggleOrigCreator = (type) => {
    document.getElementById('otherCreatorFields').style.display = type === 'other' ? 'flex' : 'none';
};

window.checkToolConfig = () => {
    const tool = document.getElementById('upTool').value;
    const sdTools = ['SD 1.5', 'SD 2.0', 'SDXL', 'Fooocus', 'ComfyUI'];
    const panel = document.getElementById('upExtraConfig');
    if (sdTools.includes(tool)) {
        panel.style.display = 'block';
        if (document.getElementById('extraRowsContainer').children.length === 0) {
            window.addExtraRow();
        }
    } else {
        panel.style.display = 'none';
    }
};

window.addExtraRow = () => {
    const container = document.getElementById('extraRowsContainer');
    const div = document.createElement('div');
    div.className = 'extra-config-row';
    div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center';
    div.innerHTML = `
                <select class="form-input extra-type" style="margin:0; flex:1">
                    <option value="CHECKPOINT">CHECKPOINT</option>
                    <option value="LORA">LORA</option>
                    <option value="EMBEDDING">EMBEDDING</option>
                </select>
                <input type="text" class="form-input extra-val" placeholder="Nombre/Valor..." style="margin:0; flex:2">
                    <button class="btn-icon" onclick="this.parentElement.remove()" style="background:#444; width:24px; height:24px; flex-shrink:0">×</button>
                    `;
    container.appendChild(div);
};

window.toggleNeg = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.addSeqStep = () => {
    seqStepCount++;
    const container = document.getElementById('seqContainer');
    const stepDiv = document.createElement('div');
    stepDiv.className = 'seq-step';
    stepDiv.style.cssText = 'border:1px solid #333; padding:15px; border-radius:8px; margin-bottom:15px';
    const negId = `seqNeg-${seqStepCount}`;
    stepDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                        <strong>Paso ${seqStepCount}</strong>
                        <button class="btn-outline" onclick="this.parentElement.parentElement.remove()" style="padding:5px 10px">Eliminar</button>
                    </div>
                    <div style="display:flex; align-items:center; margin-bottom:10px">
                        <select class="form-input seqRating" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
                        ${INFO_ICON}
                    </div>
                    <input type="file" id="upFile" class="form-input seqFile" accept="image/*" style="margin-bottom:10px" onchange="window.previewFile(this, 'seqPreview-${seqStepCount}')">
                        <div id="seqPreview-${seqStepCount}" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:10px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
                            <img src="" style="max-width:100%; max-height:300px; display:block; border-radius:4px">
                        </div>

                        <label class="form-label" style="font-size:0.7rem; color:#666">PROMPT</label>
                        <textarea class="form-input seqPrompt" placeholder="Prompt para este paso" rows="3" style="margin-bottom:10px"></textarea>

                        <div style="display:flex; justify-content:center; margin-bottom:10px">
                            <button class="btn-outline" onclick="window.toggleNeg('${negId}')" style="padding:3px 10px; font-size:0.75rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
                        </div>

                        <div id="${negId}" style="display:none; margin-bottom:10px">
                            <label class="form-label" style="font-size:0.7rem; color:#ff4444">NEGATIVE PROMPT</label>
                            <textarea class="form-input seqNegPrompt" placeholder="Negative prompt para este paso..." rows="2" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
                        </div>
                        `;
    container.appendChild(stepDiv);
};

window.previewFile = (input, previewId) => {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = preview.querySelector('img');
            if (img) img.src = e.target.result;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.doPublish = () => {
    const postType = document.querySelector('input[name="postType"]:checked')?.value || 'single';
    const title = document.getElementById('upTitle').value;
    const tool = document.getElementById('upTool').value;
    const isPrivate = document.getElementById('upPrivate').checked;
    const needsReference = document.getElementById('upReference').checked;
    const origCreatorType = document.querySelector('input[name="origCreator"]:checked')?.value || 'me';
    const origCreator = origCreatorType === 'other' ? {
        name: document.getElementById('upOrigName').value,
        url: document.getElementById('upOrigUrl').value
    } : null;

    if (!title) return alert("El título es obligatorio");
    if (origCreatorType === 'other' && !origCreator.name) return alert("Falta el nombre del creador original");

    const extraConfig = [];
    document.querySelectorAll('.extra-config-row').forEach(row => {
        const type = row.querySelector('.extra-type').value;
        const val = row.querySelector('.extra-val').value;
        if (val.trim()) {
            extraConfig.push({ type, val: val.trim() });
        }
    });

    const pubBtn = document.getElementById('pubBtn');

    if (isEditing) {
        // --- UPDATE FLOW ---
        const updateData = {
            title,
            tool,
            isPrivate,
            needsReference,
            origCreator,
            extraConfig,
            rating: document.getElementById('upRating').value,
            prompt: document.getElementById('upPrompt').value,
            negative_prompt: document.getElementById('upNegPrompt')?.value || '',
            tags: Array.from(window.selectedTags || [])
        };

        if (pubBtn) {
            pubBtn.disabled = true;
            pubBtn.innerText = "Actualizando...";
        }

        if (postType === 'single') {
            const file = document.getElementById('upFile').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                    updateData.image = reader.result;
                    const res = await store.updatePrompt(editingId, updateData);
                    handleUpdateResult(res);
                };
                reader.readAsDataURL(file);
            } else {
                const existing = store.prompts.find(x => x.id === editingId);
                updateData.image = existing?.image;
                (async () => {
                    const res = await store.updatePrompt(editingId, updateData);
                    handleUpdateResult(res);
                })();
            }
        } else {
            // Sequence Update
            const steps = Array.from(document.querySelectorAll('.seq-step'));
            const content = [];
            let loaded = 0;
            if (steps.length === 0) {
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Actualizar"; }
                return alert("Añade al menos un paso");
            }
            steps.forEach((step, idx) => {
                const file = step.querySelector('.seqFile').files[0];
                const prompt = step.querySelector('.seqPrompt').value;
                const negPrompt = step.querySelector('.seqNegPrompt').value;
                const rating = step.querySelector('.seqRating').value;
                if (!file) {
                    const existing = store.prompts.find(x => x.id === editingId);
                    content[idx] = { image: existing?.content[idx]?.image, prompt, negative_prompt: negPrompt, rating };
                    loaded++;
                    if (loaded === steps.length) finalizeUpdate();
                } else {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        content[idx] = { image: reader.result, prompt, negative_prompt: negPrompt, rating };
                        loaded++;
                        if (loaded === steps.length) await finalizeUpdate();
                    };
                    reader.readAsDataURL(file);
                }
            });

            async function finalizeUpdate() {
                updateData.type = 'sequence';
                updateData.content = content.filter(c => c); // Remove empty slots
                const res = await store.updatePrompt(editingId, updateData);
                handleUpdateResult(res);
            }
        }

        async function handleUpdateResult(res) {
            if (res.success) {
                window.closeModals();
                await store.init();
                render();
                window.toast("Prompt Actualizado", "success");
            } else {
                alert(res.msg);
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Actualizar"; }
            }
        }
        return;
    }

    if (pubBtn) {
        pubBtn.disabled = true;
        pubBtn.innerText = "Publicando...";
    }

    if (postType === 'single') {
        const file = document.getElementById('upFile').files[0];
        if (!file) {
            if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            if (window.toast) window.toast("Imagen obligatoria", "error"); return;
        }
        const negPrompt = document.getElementById('upNegPrompt').value;
        const reader = new FileReader();
        reader.onload = async () => {
            const res = await store.addPrompt({
                title,
                tool,
                rating: document.getElementById('upRating').value,
                image: reader.result,
                prompt: document.getElementById('upPrompt').value,
                negative_prompt: negPrompt,
                type: 'single',
                isPrivate,
                needsReference,
                origCreator,
                extraConfig
            });
            if (!res.success) {
                alert(res.msg);
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            } else {
                window.closeModals();
                await store.init(); // Refresh data
                render();

                // Track Event in GA4
                window.trackEvent('publish_post', {
                    title: title,
                    tool: tool,
                    type: 'single'
                });

                if (res.leveledUp) {
                    setTimeout(() => window.showLevelUpModal(res.newLevel), 500);
                }
            }
        };
        reader.readAsDataURL(file);
    } else {
        const steps = Array.from(document.querySelectorAll('.seq-step'));
        if (steps.length === 0) {
            if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
            return alert("Añade al menos un paso");
        }

        const content = [];
        let loaded = 0;

        steps.forEach((step, idx) => {
            const file = step.querySelector('.seqFile').files[0];
            const prompt = step.querySelector('.seqPrompt').value;
            const negPrompt = step.querySelector('.seqNegPrompt').value;
            const rating = step.querySelector('.seqRating').value;
            if (!file) {
                if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
                return alert(`Falta imagen en paso ${idx + 1}`);
            }

            const reader = new FileReader();
            reader.onload = async () => {
                content.push({ image: reader.result, prompt, negative_prompt: negPrompt, rating });
                loaded++;
                if (loaded === steps.length) {
                    const res = await store.addPrompt({
                        title,
                        tool,
                        type: 'sequence',
                        content,
                        isPrivate,
                        needsReference,
                        origCreator,
                        extraConfig
                    });
                    if (!res.success) {
                        alert("❌ Error: " + res.msg);
                        if (pubBtn) { pubBtn.disabled = false; pubBtn.innerText = "Publicar"; }
                    } else {
                        seqStepCount = 0;
                        window.closeModals();
                        await store.init();
                        render();

                        // Track Event in GA4
                        window.trackEvent('publish_post', {
                            title: title,
                            tool: tool,
                            type: 'sequence',
                            steps: steps.length
                        });
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }
};


window.closeModals = () => {
    const modals = ['viewModal', 'settingsModal', 'confirmModal', 'createModal'];
    modals.forEach(m => {
        const el = document.getElementById(m);
        if (el) el.style.display = 'none';
    });
    const dtm = document.getElementById('dynamicTipModal');
    if (dtm) dtm.remove();
};

window.doLogout = () => {
    store.logout();
    window.location.href = '/';
};

window.doFollow = async (username) => {
    if (!store.currentUser) return window.openLogin();

    // UI Feedback inmediato
    window.toast("Actualizando seguimiento...", "info");

    const res = await store.followUser(username);
    if (res.success) {
        const msg = res.action === 'follow' ? `Ahora sigues a @${username}` : `Has dejado de seguir a @${username}`;
        window.toast(msg, "success");
        render(); // Re-renderizar para actualizar botones y contadores
    } else {
        window.toast(res.msg || "Error al procesar", "error");
    }
};

window.toggleAuth = (m) => {
    document.getElementById('loginForm').style.display = m === 'log' ? 'block' : 'none';
    document.getElementById('regForm').style.display = m === 'reg' ? 'block' : 'none';
    const recForm = document.getElementById('recoverForm');
    if (recForm) recForm.style.display = m === 'rec' ? 'block' : 'none';
    const actForm = document.getElementById('activateForm');
    if (actForm) actForm.style.display = m === 'act' ? 'block' : 'none';
};

window.doLoginSubmit = async () => {
    const res = await store.login(document.getElementById('logUser').value, document.getElementById('logPass').value);
    if (!res.success) alert(res.msg);
    else render();
};

// Domain whitelist (debe coincidir con AuthModal.js)
const ALLOWED_DOMAINS = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'apple.com',
    'protonmail.com', 'proton.me', 'tutanota.com', 'tuta.io',
    'aol.com', 'zoho.com', 'yandex.com', 'mail.com', 'gmx.com',
    'rocketmail.com', 'fastmail.com', 'hushmail.com', 'prompt-gallery.app'
];

window.doRegisterSubmit = async () => {
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const domain = email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
        if (window.toast) window.toast("Por seguridad no puedes registrarte con ese correo, prueba con otro.", "error");
        else alert("Por seguridad no puedes registrarte con ese correo, prueba con otro.");
        return;
    }

    const res = await store.register(email, document.getElementById('regUser').value, document.getElementById('regPass').value);
    if (!res.success) {
        alert(res.msg);
    } else {
        // ÉXITO: Limpiar formulario y avisar sobre verificación
        document.getElementById('regEmail').value = '';
        document.getElementById('regUser').value = '';
        document.getElementById('regPass').value = '';

        if (window.toast) window.toast("🎉 ¡Cuenta creada! Hemos enviado un link de activación a tu correo. Revísalo (incluso en spam) para poder entrar.", "success");
        else alert("🎉 ¡Cuenta creada! Hemos enviado un link de activación a tu correo. Revísalo (incluso en spam) para poder entrar.");

        window.toggleAuth('log'); // Mandar a login tras registro
    }
};

window.doRecoverSubmit = async () => {
    const email = document.getElementById('recEmail').value;
    if (!email) { if (window.toast) window.toast("Por favor introduce tu email.", "warning"); return; }
    const res = await store.recoverPassword(email);
    if (res.success) {
        if (window.toast) window.toast(res.msg, "success");
        else alert(res.msg);
        document.getElementById('recEmail').value = '';
        window.toggleAuth('log');
    } else {
        if (window.toast) window.toast(res.msg, "error");
        else alert(res.msg);
    }
};

window.doActivateSubmit = async () => {
    const userOrEmail = document.getElementById('actUser').value;
    const pass = document.getElementById('actPass').value;

    // Buscar token en variable global, query params, o hash fragment (PocketBase usa hash)
    const token = window._authToken || new URLSearchParams(window.location.search).get('token') || (window.location.hash.split('/').pop());

    if (!userOrEmail || !pass) { if (window.toast) window.toast("Rellena todos los campos.", "warning"); return; }
    if (!token || token.length < 10) return alert("Token de activación no encontrado o inválido.");

    if (window.toast) window.toast("Procesando solicitud...", "info");

    const res = await store.confirmResetPassword(token, pass, userOrEmail);
    if (res.success) {
        const isPasswordReset = window._authType === 'password-reset';
        const msg = isPasswordReset
            ? "¡Contraseña actualizada con éxito! Ya puedes entrar."
            : "¡Cuenta activada con éxito! Bienvenido.";
        alert(msg);
        window.location.hash = '';
        window.location.search = '';
        window.location.reload();
    } else {
        alert(res.msg);
    }
};

window.openLogin = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('log');
};

window.openRegister = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('reg');
};



window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};

window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        modal.style.zIndex = '9999999';
    }
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewAvatar').style.backgroundImage = `url('${e.target.result}')`;
        }
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveSettings = async () => {
    const username = document.getElementById('setUser').value;
    const avatarFile = document.getElementById('setAvatarFile').files[0];

    const finishSave = async (avatarData) => {
        const socials = store.checkLevelFeature('socials').hasAccess ? {
            ig: document.getElementById('setIg').value,
            fb: document.getElementById('setFb').value,
            x: document.getElementById('setX').value,
            tg: document.getElementById('setTg').value,
            th: document.getElementById('setTh').value,
            fv: document.getElementById('setFv').value
        } : (store.currentUser.socials || {});
        const moderation = {
            suggestive: document.getElementById('setModSugg').value,
            nsfw: document.getElementById('setModNsfw').value
        };
        const updateData = { username, socials, moderation };
        if (avatarData) updateData.avatar = avatarData;
        const res = await store.updateUserSettings(updateData);
        if (res.success) { render(); window.closeModals(); }
        else alert(res.msg);
    };

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = () => finishSave(reader.result);
        reader.readAsDataURL(avatarFile);
    } else finishSave(null);
};

window.doChangePassword = async () => {
    const op = document.getElementById('oldPassInput').value;
    const np = document.getElementById('newPassInput').value;

    if (!op) { if (window.toast) window.toast("Introduce tu clave actual", "warning"); return; }
    if (np.length < 6) { if (window.toast) window.toast("La nueva clave debe tener 6+ caracteres", "warning"); return; }

    const btn = document.getElementById('btnUpdatePass');
    btn.disabled = true;
    btn.innerText = "Verificando...";

    const res = await store.changePassword(op, np);

    if (res.success) {
        if (window.toast) window.toast(res.msg, "success");
        document.getElementById('oldPassInput').value = '';
        document.getElementById('newPassInput').value = '';
        document.getElementById('passSec').style.display = 'none';
    } else {
        if (window.toast) window.toast(res.msg, "error");
    }

    btn.disabled = false;
    btn.innerText = "Actualizar Contraseña";
};

window.doDeleteAccount = async () => {
    if (await window.askConfirm('⚠️ PELIGRO ⚠️\n¿Eliminar tu cuenta permanentemente?\nEsta acción NO se puede deshacer.', '🔥')) {
        const confirmation = prompt("Escribe 'ELIMINAR' para confirmar borrado total:");
        if (confirmation === 'ELIMINAR') {
            store.deleteAccount();
            window.location.href = '/';
        }
    }
};

window.togglePass = (id, btn) => {
    const el = document.getElementById(id);
    if (el.type === 'password') { el.type = 'text'; btn.innerText = '🙈'; }
    else { el.type = 'password'; btn.innerText = '👁️'; }
};

// => window.openLevelProgress se ha movido y centralizado en:
// src/components/Modals/LevelModals.js
// Esto permite que el sistema de niveles sea global y soporte los nuevos
// requerimientos complejos (Referidos, Reacciones y Reputación).



// --- CONFIRMATION & TOAST SYSTEM ---

window.askConfirm = (msg, icon = '❓') => {
    return new Promise((resolve) => {
        let modal = document.getElementById('confirmModal');
        // If modal doesn't exist, try to find it in DOM or fallback
        if (!modal) {
            if (confirm(msg)) resolve(true);
            else resolve(false);
            return;
        }

        const text = document.getElementById('confirmText');
        const ico = document.getElementById('confirmIcon');

        // Define cleanup function
        const cleanup = (val) => {
            modal.style.display = 'none';
            resolve(val);
        };

        window.confirmResolve = cleanup;

        if (modal && text) {
            text.innerText = msg;
            if (ico) ico.innerText = icon;
            modal.style.display = 'flex';
        }
    });
};

window.toast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pg-toast ${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
                        <div class="toast-icon">${icon}</div>
                        <div class="toast-content">${message}</div>
                        `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};



window.openDirectTip = (recipientId, username) => {
    if (!store.currentUser) {
        alert("Debes iniciar sesión para enviar propinas.");
        return;
    }

    // Remove any existing dynamic tip modal
    const existingModal = document.getElementById('dynamicTipModal');
    if (existingModal) existingModal.remove();

    // Create modal dynamically
    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9000000; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
                        <div style="background:#1a1a2e; border:1px solid #333; border-radius:16px; padding:30px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                            <div style="font-size:3rem; margin-bottom:10px">💎</div>
                            <h2 style="color:#fff; margin:0 0 5px 0">Apoyar a @${username}</h2>
                            <p style="color:#888; margin-bottom:20px">Regala PromptBits directamente a este creador</p>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px">
                                <button onclick="window.doSendDirectTip('${recipientId}', 5)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 5</button>
                                <button onclick="window.doSendDirectTip('${recipientId}', 10)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 10</button>
                                <button onclick="window.doSendDirectTip('${recipientId}', 20)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 20</button>
                                <button onclick="window.doSendDirectTip('${recipientId}', 50)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 50</button>
                            </div>

                            <div style="display:flex; gap:8px; margin-bottom:20px; align-items:center">
                                <input id="customDirectTipAmount" type="number" min="1" step="1" placeholder="Otro monto..."
                                    style="flex:1; background:#0f0f23; border:1px solid #333; color:#fff; padding:10px 14px; border-radius:8px; font-size:1rem; outline:none;"
                                    onkeydown="if(event.key==='Enter'){document.getElementById('sendCustomDirectTipBtn').click()}" />
                                <button id="sendCustomDirectTipBtn" onclick="const v=parseInt(document.getElementById('customDirectTipAmount').value);if(v>0)window.doSendDirectTip('${recipientId}',v);else window.toast&&window.toast('Ingresa un monto válido','warning')"
                                    style="background:linear-gradient(135deg,#a855f7,#6366f1); border:none; color:#fff; padding:10px 18px; border-radius:8px; cursor:pointer; font-weight:600; white-space:nowrap">
                                    Enviar
                                </button>
                            </div>

                            <div style="font-size:0.85rem; color:#666; margin-bottom:20px">
                                Tu saldo: <span style="color:#a29bfe; font-weight:700">${store.currentUser.tokens || 0}</span> PromptBits
                            </div>

                            <button onclick="document.getElementById('dynamicTipModal').remove()" style="background:transparent; border:none; color:#666; padding:10px 20px; cursor:pointer; font-size:0.9rem">Cancelar</button>
                        </div>
                        `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
};

window.doSendDirectTip = async (recipientId, amount) => {
    if (await window.askConfirm(`¿Enviar ${amount} PromptBits a este creador?`, '💎')) {
        window.toast("Enviando PromptBits...", "info");
        const res = await store.sendTip(null, amount, recipientId);
        if (res.success) {
            window.toast(res.msg, 'success');
            const dtm = document.getElementById('dynamicTipModal');
            if (dtm) dtm.remove();
            render();
        } else {
            window.toast("❌ " + res.msg, 'error');
        }
    }
};

const init = async () => {
    console.log("[PROFILE] init starting...");
    await store.init();

    // Iniciar Chat solo cuando el store (usuario) esté listo
    if (typeof initLiveChat === 'function') {
        initLiveChat();
    }

    if (profileUser) {
        console.log(`[PROFILE] fetching profile for: ${profileUser}`);
        const user = await store.fetchUserProfileByUsername(profileUser);
        if (user) {
            // 1. CARGA MAESTRA PARA ANÁLISIS (Todos los del usuario para stats/prompts_count)
            await store.loadUserPromptsForAnalysis(user.id);

            // 2. RECICLAJE DE MEMORIA PARA GALERÍA
            // PocketHost falla por rate limit si hacemos getList después de getFullList.
            // Asi que inyectamos los que ya trajimos directamente a store.prompts
            if (store.userAllPrompts && store.userAllPrompts.length > 0) {
                store.prompts = store.userAllPrompts.slice(0, 60);
                store.currentPage = 1;
                store.hasMore = store.userAllPrompts.length > 60;
                store.isLoadingMore = false;
                console.log(`[PROFILE] ♻️ Reutilizados ${store.prompts.length} prompts maestros para la visualización.`);
            } else {
                // Caída si por alguna razón falla el master load
                const filter = `author = "${user.id}"`;
                await store.loadPrompts(true, filter);
            }
        }
    }
    window.initDone = true;
    render();
    console.log("[PROFILE] init fully done.");

    if (MAINTENANCE_MODE) {
        renderMaintenance();
    }
};

// --- USER ACTIVITY LOGS ---

const ActivityModal = () => `
                        <div id="activityModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) { document.getElementById('activityModal').style.display='none'; store.unsubscribeUserLogs(); }">
                            <div class="modal-container" style="max-width:500px; height:80vh; display:flex; flex-direction:column">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px">
                                    <h2 style="margin:0">📜 Mi Actividad</h2>
                                    <button class="modal-close-x" onclick="document.getElementById('activityModal').style.display='none'; store.unsubscribeUserLogs();" style="position:static">✕</button>
                                </div>
                                <div id="activityList" style="flex:1; overflow-y:auto; padding-right:5px">
                                    <div style="text-align:center; padding:20px; color:#666">Cargando...</div>
                                </div>
                            </div>
                        </div>`;

window.openActivity = async () => {
    const modal = document.getElementById('activityModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Initial fetch
    const logs = await store.getUserActivityLogs();
    renderActivityLogs(logs);

    // Realtime subscription
    store.subscribeToUserLogs((newLog) => {
        // Prepend new log to current list (visual only)
        const container = document.getElementById('activityList');
        if (container) {
            // Remove "No activity" or "Loading" msg if exists
            const emptyMsg = container.querySelector('.empty-state');
            if (emptyMsg) emptyMsg.remove();

            // Render single log and prepend
            const logHtml = createLogItemHtml(newLog);
            container.insertAdjacentHTML('afterbegin', logHtml);
        }
    });
};

const createLogItemHtml = (log) => {
    let icon = '📝';
    let title = 'Acción';
    let detail = '';
    let color = '#888';

    // Details extraction
    const d = log.details || {};

    switch (log.action) {
        case 'login': icon = '🔑'; title = 'Iniciaste Sesión'; color = '#a29bfe'; break;
        case 'signup': icon = '👋'; title = 'Bienvenido a Prompt Gallery'; color = '#a29bfe'; break;
        case 'publish': icon = '🖼️'; title = 'Publicaste un Post'; detail = d.title || ''; color = '#00cec9'; break;
        case 'comment': icon = '💬'; title = 'Comentaste'; detail = `en ${d.postTitle || 'un post'}`; break;
        case 'like': icon = '👍'; title = 'Te gustó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'love': icon = '❤️'; title = 'Te encantó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'fire': icon = '🔥'; title = 'Diste fuego'; detail = `${d.postTitle || 'un post'}`; break;
        case 'funny': icon = '😂'; title = 'Te divirtió'; detail = `${d.postTitle || 'un post'}`; break;
        case 'sad': icon = '😢'; title = 'Te entristeció'; detail = `${d.postTitle || 'un post'}`; break;
        case 'dislike': icon = '👎'; title = 'No te gustó'; detail = `${d.postTitle || 'un post'}`; break;
        case 'follow': icon = '👤'; title = 'Seguiste a un usuario'; detail = `@${d.target || 'usuario'}`; break;
        case 'tip': // Valid for legacy logs
        case 'tip_sent':
            icon = '💎';
            color = '#fdcb6e';
            title = `Enviaste ${d.amount} PromptBits`;
            detail = `a @${d.recipient || 'usuario'}`;
            break;
        case 'tip_received':
            icon = '🎁';
            color = '#00b894'; // Green for receiving
            title = `Recibiste ${d.amount} PromptBits`;
            detail = `de @${d.sender || 'un usuario'}`;
            break;
        case 'level_up':
            icon = '🆙';
            color = '#e17055';
            title = `¡Subiste de Nivel!`;
            detail = `Alcanzaste el Nivel ${d.newLevel}`;
            break;
    }

    const time = new Date(log.created_at).toLocaleString('es-MX', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
                        <div style="display:flex; gap:15px; padding:15px; background:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:10px; align-items:center; border-left:3px solid ${color}; animation: fadeIn 0.5s ease">
                            <div style="font-size:1.5rem">${icon}</div>
                            <div style="flex:1">
                                <div style="font-weight:600; font-size:0.9rem; color:#eee">${title}</div>
                                ${detail ? `<div style="font-size:0.8rem; color:#aaa">${detail}</div>` : ''}
                            </div>
                            <div style="font-size:0.75rem; color:#666; white-space:nowrap">${time}</div>
                        </div>`;
};

// --- ADMIN ACTIONS ---
window.doClaimGhosts = async () => {
    if (!confirm("Esto buscará todos los posts antiguos con tu nombre y actualizará su ID al actual. ¿Continuar?")) return;
    if (window.toast) window.toast("Iniciando reparación...", "info");

    try {
        const res = await store.claimGhostPosts();
        if (res.success) {
            if (window.toast) window.toast(res.msg, "success");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            if (window.toast) window.toast(res.msg, "error");
            else alert(res.msg);
        }
    } catch (err) {
        console.error("Claim handler error:", err);
        alert("Error crítico en la reparación");
    }
};

window.copyReferralText = function (text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.innerText;
        btnElement.innerText = "✅ Copiado";
        setTimeout(() => btnElement.innerText = originalText, 2000);
    }).catch(err => {
        if (window.toast) window.toast("Error al copiar: " + err, "error");
    });
};

const ReferralsTab = async (user) => {
    const isMe = store.currentUser && store.currentUser.id === user.id;
    const wrapper = document.getElementById('referrals-wrapper');
    if (!wrapper) return;

    if (!isMe) {
        wrapper.innerHTML = `<div class="container" style="padding:40px; text-align:center; color:#888;">Esta información es privada.</div>`;
        return;
    }

    if (!user.level || user.level < 1) {
        wrapper.innerHTML = `
        <div class="container" style="margin-top: 40px; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 60px 20px; border-radius: 20px; border: 2px solid var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🔰</div>
                <h2 style="font-size: 2rem; color: #fff; margin-bottom: 10px;">¡Sube de nivel para invitar amigos!</h2>
                <p style="color: #888; font-size: 1.1rem; margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    Necesitas alcanzar el <b>Nivel 1 (Novato)</b> para desbloquear tu link de referido. ¡Comparte 5 prompts en la galería comunitaria para subir!
                </p>
                <button class="btn" onclick="window.openCreate()" style="padding: 15px 40px; font-size: 1.2rem; border-radius: 50px;">
                    🚀 Compartir un Prompt Ahora
                </button>
            </div>
        </div>
        `;
        return;
    }

    wrapper.innerHTML = `<div class="container" style="padding:40px 0; color:#666; text-align:center"><div class="spinner"></div> Cargando datos de referidos...</div>`;

    let stats = { total: 0, active: 0, pending: 0, totalEarned: 0 };
    let list = [];
    let link = '';
    let code = '';

    try {
        if (store.referralSystem) {
            code = await store.referralSystem.getReferralCode(user.id);
            link = await store.referralSystem.getReferralLink(user.id);
            stats = await store.referralSystem.getReferralStats(user.id) || stats;
            list = await store.referralSystem.getUserReferrals(user.id) || [];
        }
    } catch (e) {
        console.error("Referral fetch error:", e);
    }

    wrapper.innerHTML = `
    <div class="container" style="max-width: 800px; margin-top: 20px; animation: fadeIn 0.4s ease;">
        
        <!-- Header / Link Section -->
        <div style="background: rgba(20,20,20,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 10px;">🤝</div>
            <h2 style="margin-bottom: 10px; font-size: 1.5rem;">Invita Creadores, Gana PromptBits</h2>
            <p style="color: #aaa; margin-bottom: 25px; font-size: 0.95rem;">Comparte tu código con amigos. Cuando se registren y publiquen 5 prompts, <strong style="color:var(--accent)">ganarás 5 💎 PromptBits</strong> y ellos entrarán a la galería.</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 500px; margin: 0 auto;">
                <!-- Code Box -->
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden;">
                    <div style="padding: 12px 15px; color: #888; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); display: flex; align-items: center; gap: 8px;">
                        <span>🎫</span> Código
                    </div>
                    <div style="flex: 1; padding: 12px 15px; text-align: left; font-family: monospace; font-size: 1.1rem; letter-spacing: 2px; color: #fff; font-weight: bold;">
                        ${code}
                    </div>
                    <button class="btn-glass" style="border: none; border-radius: 0; padding: 12px 20px; border-left: 1px solid rgba(255,255,255,0.1); height: 100%; display: flex; align-items: center;" onclick="window.copyReferralText('${code}', this)">
                        📋 Copiar
                    </button>
                </div>

                <!-- Link Box -->
                <div style="display: flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden;">
                    <div style="flex: 1; padding: 12px 15px; text-align: left; font-size: 0.85rem; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${link}
                    </div>
                    <button class="btn-primary" style="border: none; border-radius: 0; padding: 12px 20px; font-weight: bold; height: 100%;" onclick="window.copyReferralText('${link}', this)">
                        🔗 Copiar Link
                    </button>
                </div>
            </div>
        </div>

        <!-- Stats Section -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 5px;">${stats.total}</div>
                <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">Referidos Totales</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; color: #60a5fa; margin-bottom: 5px;">${stats.active}</div>
                <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">Activos / Completados</div>
            </div>
            <div style="background: rgba(255, 171, 0, 0.05); border: 1px solid rgba(255, 171, 0, 0.2); padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; color: #ffb142; margin-bottom: 5px;">${stats.pending}</div>
                <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">En Progreso</div>
            </div>
            <div style="background: rgba(162, 155, 254, 0.05); border: 1px solid rgba(162, 155, 254, 0.2); padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 800; color: #a29bfe; margin-bottom: 5px;">+${stats.totalEarned} 💎</div>
                <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">Total Ganado</div>
            </div>
        </div>

        <!-- List Section -->
        <h3 style="margin-bottom: 15px; font-size: 1.2rem; display: flex; align-items: center; gap: 10px;">
            <span>📋</span> Historial de Referidos
        </h3>
        
        ${list.length === 0 ? `
            <div style="background: rgba(0,0,0,0.2); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 40px; text-align: center; color: #777;">
                <span style="font-size: 2rem; display: block; margin-bottom: 10px;">👻</span>
                Aún no tienes referidos. ¡Comparte tu link para empezar!
            </div>
        ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${list.map(r => {
        const isAct = r.status === 'active';
        const pct = Math.min((r.prompts_count / 5) * 100, 100);

        return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${r.user?.avatar || 'https://robohash.org/' + r.user?.username}'); background-size: cover; background-color: #222;"></div>
                            <div>
                                <div style="font-weight: bold; font-size: 1rem;">@${r.user?.username || 'Usuario'}</div>
                                <div style="font-size: 0.75rem; color: #888;">Registrado: ${new Date(r.registeredAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        
                        <div style="text-align: right; min-width: 150px;">
                            ${isAct ? `
                                <div style="color: #4cd137; font-weight: bold; display: flex; align-items: center; gap: 5px; justify-content: flex-end;">
                                    ✅ <span style="background: rgba(76, 209, 55, 0.1); padding: 2px 8px; border-radius: 10px;">Completado</span>
                                </div>
                                <div style="font-size: 0.75rem; color: #a29bfe; margin-top: 4px;">+ 5 💎 PromptBits</div>
                            ` : `
                                <div style="color: #ffb142; font-weight: bold; font-size: 0.85rem; margin-bottom: 5px; display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
                                    ⏳ ${r.prompts_count}/5 Prompts
                                </div>
                                <div style="width: 150px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; float: right;">
                                    <div style="width: ${pct}%; height: 100%; background: #ffb142; border-radius: 10px;"></div>
                                </div>
                            `}
                        </div>
                    </div>
                    `;
    }).join('')}
            </div>
        `}
    </div>
    `;
};

init();

// --- TOKEN DETECTION (Password Reset & Email Verification) ---
// Replicado de main.js para que funcione también en la página de perfil
window._authToken = window._authToken || '';
window._authType = window._authType || '';

const processTokensProfile = async () => {
    console.log("🔍 [PROFILE] Checking for tokens in URL/Hash...");
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');
    let type = '';

    const hash = window.location.hash;

    if (!token && hash) {
        if (hash.includes('confirm-verification')) {
            const parts = hash.split('/');
            token = parts[parts.length - 1];
            type = 'verify';
            console.log("✅ [PROFILE] Verification token found:", token);
        } else if (hash.includes('confirm-password-reset')) {
            token = hash.split('/').pop();
            type = 'password-reset';
            console.log("✅ [PROFILE] Reset token found:", token);
        }
    }

    if (token && token.length >= 10) {
        window._authToken = token;
        window._authType = type;
        console.log(`🔐 [PROFILE] Token detectado [${type || 'auto'}]. Procesando...`);

        if (type === 'verify') {
            const res = await store.confirmVerification(token);
            if (res.success) {
                alert("✅ ¡Cuenta verificada con éxito! Bienvenido a la comunidad.\n\nPor favor inicia sesión para empezar.");
                window.location.hash = '';
                const modal = document.getElementById('authModal');
                if (modal) {
                    window.toggleAuth('log');
                    modal.style.display = 'flex';
                }
            } else {
                alert("❌ " + (res.msg || "Error al verificar la cuenta."));
                window.location.hash = '';
            }
        } else {
            // Password Reset o Activación — mostrar el formulario de activación
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.style.display = 'flex';
                window.toggleAuth('act');

                if (type === 'password-reset') {
                    const titleEl = document.getElementById('actTitle');
                    const descEl = document.getElementById('actDesc');
                    if (titleEl) titleEl.innerText = "Nueva Contraseña";
                    if (descEl) descEl.innerText = "Introduce tu usuario y la nueva contraseña que deseas usar.";
                    const btnEl = document.querySelector('#activateForm .btn');
                    if (btnEl) btnEl.innerText = "Cambiar y Entrar";
                }
            }
        }
    }
};

window.addEventListener('load', processTokensProfile);
