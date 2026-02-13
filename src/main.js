import './style.css'
// Deploy Timestamp: 2026-02-09T18:52:00-06:00 (UI Fix + Maintenance 3D)
import './admin_fix.css' // Emergency CSS Fix for Admin Panel
import { pb } from './pocketbase.js';
import { store, TOOLS, RATINGS, RATING_INFO, INFO_ICON, LEVEL_REQS } from './store-final.js';
import { renderCollage } from './components/Collage.js';
import { TopBar, Header, ProfileHeader } from './components/Layout.js';
import { HeroCarousel } from './components/HeroCarousel.js';
import { Gallery } from './components/Gallery.js';
import { AuthModal } from './components/Modals/AuthModal.js';
import { CreateModal } from './components/Modals/CreateModal.js';
import { SettingsModal } from './components/Modals/SettingsModal.js';
import { TipModal } from './components/Modals/TipModal.js';
import { ConfirmModal } from './components/Modals/ConfirmModal.js';
import { ActivityModal } from './components/Modals/ActivityModal.js';
import { setupLevelModals } from './components/Modals/LevelModals.js';
import './utils/LevelDebug.js'; // Load Debug Tools

import { renderTopCreators } from './components/TopCreators.js';

import { AdvancedFilters } from './components/AdvancedFilters.js';
import { uploadToCloudinary } from './uploadService.js';
import { escapeHTML, getModeration } from './utils/security.js';
import { isImageFile, previewFile, togglePass } from './utils/dom.js';
import { toast, showTokenCelebration, askConfirm, handleConfirmResolve } from './utils/ui-helpers.js';
import { LEGAL_TEXTS, InfoModal, openInfo } from './components/Legal.js';
import { TAG_CATEGORIES } from './data/tags.js';
import { TAG_ALIASES } from './data/tagAliases.js';
import { DetailModalTemplate as DetailModal } from './components/DetailModal.js';
import { SearchSuggestions } from './components/SearchSuggestions.js';
import { filterPrompts } from './utils/gallery-filter.js';
import { getSearchSuggestions } from './utils/search-logic.js';

// --- MODO MANTENIMIENTO (Activar/Desactivar aquí) ---
const MAINTENANCE_MODE = false;

// Script Initialization
console.log("🚀 Prompt Gallery Initialized");
setupLevelModals();


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

                    <div style="
                        padding: 30px;
                        background: rgba(0,0,0,0.6);
                        border-radius: 28px;
                        border: 1px solid rgba(255,255,255,0.1);
                        position: relative;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                    ">
                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 20px; overflow: hidden;">
                            <div style="width: 85%; height: 100%; background: linear-gradient(90deg, #2563eb, #60a5fa, #93c5fd); animation: progress 3.5s ease-in-out infinite;"></div>
                        </div>
                        <p style="font-size: 0.8rem; color: #666; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Sincronizando Archivos Finales...</p>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes float3d {
                0%, 100% { transform: rotateX(10deg) rotateY(-10deg) translateY(0px); }
                50% { transform: rotateX(15deg) rotateY(5deg) translateY(-25px); }
            }
            @keyframes progress {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(0%); }
                100% { transform: translateX(100%); }
            }
            body { 
                margin: 0; 
                background: #000; 
                height: 100vh; 
                width: 100vw; 
                overflow: hidden !important; 
            }
        </style>
    `;

    document.body.appendChild(overlay);
};


// --- SECURITY HELPERS ---
window.escapeHTML = escapeHTML;

// --- GLOBAL STATE ---
let currentView = 'home';
let profileUser = null;
let profileTab = 'creations';
let searchQuery = '';
let filters = {
    source: 'community',
    sort: 'newest',
    time: 'all',
    tools: [], // Multi-select array
    refFilter: 'all',
    ratings: [], // Multi-select array
    categories: [],
    tags: []
};

// --- ADMIN SORT STATE ---
window.adminSort = { col: 'username', dir: 'asc' };

// --- TOP CREATORS STATE ---
let topCreatorsList = [];
window.openUserProfile = (username) => {
    window.location.href = `/profile.html?u=${encodeURIComponent(username)}`;
};

// --- TAGS STATE ---
window.selectedTags = new Set();
window.openCategory = null;

// --- SAFETY CHECK: Ensure NSFW Reveal Buttons always exist in Detail View ---
setInterval(() => {
    document.querySelectorAll('.card-blurred').forEach(wrapper => {
        // Find or create overlay
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
            // Force inject button in MODAL detail
            if (!hasButton) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span> <button class="btn" style="margin-top:10px; background: #ff4444; color: white; border:none; padding: 5px 10px; border-radius:4px; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); window.revealImage(this)">👁️ Revelar Imagen</button>`;
            }
        } else {
            // Dashboard / Collage: Only show Label, NO button
            if (hasButton || !hasLabel) {
                overlay.innerHTML = `<span>🔞 ${warningLabel}</span> `;
            }
        }
    });
}, 500);

// Constants imported from store-final.js

const app = document.querySelector('#app');

// Exponer render y filters a window para que funcionen con onclick/onchange inline
window.filters = filters;
window.render = null; // Se asignará cuando se defina render

// NEW: Gate filter changes
window.setFilter = (key, value) => {
    if (!store.currentUser) {
        if (window.toast) window.toast("Debes iniciar sesión para usar los filtros.", "warning");
        return;
    }
    filters[key] = value;
    render();
};

window.toggleFilter = (key, value) => {
    if (!store.currentUser) {
        if (window.toast) window.toast("Debes iniciar sesión para usar los filtros.", "warning");
        return;
    }
    const idx = filters[key].indexOf(value);
    if (idx > -1) filters[key].splice(idx, 1);
    else filters[key].push(value);
    render();
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

window.handleSearchTypingMobile = (val) => {
    const query = val.trim();
    const mount = document.getElementById('search-mobile-suggestions-mount');
    if (!mount) return;

    if (query.length === 0) {
        mount.innerHTML = '';
        return;
    }

    const mi = document.getElementById('searchMobileInput'); if (mi) mi.value = val;

    const results = getSearchSuggestions({ query, store });
    mount.innerHTML = SearchSuggestions(results);
};

window.handleSearch = (val) => {
    searchQuery = val;
    // Update both inputs
    const di = document.getElementById('searchInput'); if (di) di.value = val;
    const mi = document.getElementById('searchMobileInput'); if (mi) mi.value = val;

    // Clear suggestions
    const dm = document.getElementById('search-suggestions-mount'); if (dm) dm.innerHTML = '';
    const mm = document.getElementById('search-mobile-suggestions-mount'); if (mm) mm.innerHTML = '';

    render();
};

window.handleTagSearch = (tag) => {
    searchQuery = tag;
    const desktopInput = document.getElementById('searchInput');
    if (desktopInput) desktopInput.value = tag;

    // Hide suggestions
    const mount = document.getElementById('search-suggestions-mount');
    if (mount) mount.innerHTML = '';

    render();
};

// Global click to close suggestions
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        const mount = document.getElementById('search-suggestions-mount');
        if (mount) mount.innerHTML = '';
    }
});

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
    render();
};
// INFO_ICON and RATING_INFO imported from store-final.js

// renderCollage moved to components/Collage.js

// --- LEGAL CONTENT ---
// LEGAL_TEXTS imported from components/Legal.js

// --- COMPONENTS ---



const getFilteredPrompts = () => {
    return filterPrompts({
        prompts: store.prompts,
        currentUser: store.currentUser,
        currentView,
        profileUser,
        profileTab,
        filters,
        searchQuery
    });
};






const loadTopCreators = async () => {

    topCreatorsList = await store.getTopCreators();
    if (currentView === 'home' && filters.source === 'community') render(); // Re-render if on home
};



const Modals = () => AuthModal() + CreateModal() + InfoModal() + ConfirmModal() + ActivityModal() + SettingsModal() + TipModal();

// --- LOGIC ---
const render = () => {
    // Estrategia No-Destructiva: No sobrescribir todo el app.innerHTML si ya existe la estructura
    if (!document.getElementById('main-gallery-container')) {
        app.innerHTML = `
            <div id="topbar-mount"></div>
            <div id="header-mount"></div>
            <div id="hero-mount"></div>
            <div id="profile-mount" style="display:none"></div>
            <div id="main-gallery-container"></div>
            <div id="modals-mount"></div>
            <div id="adv-filter-mount"></div>
        `;
        const modalsMount = document.getElementById('modals-mount');
        if (modalsMount) modalsMount.innerHTML = Modals();
    }

    // Advanced Filter Panel
    const advFilterMount = document.getElementById('adv-filter-mount');
    if (advFilterMount) advFilterMount.innerHTML = AdvancedFilters(filters);

    // Actualizar solo las partes dinámicas
    const topBarMount = document.getElementById('topbar-mount');
    if (topBarMount) topBarMount.innerHTML = store.currentUser ? TopBar() : '';

    const headerMount = document.getElementById('header-mount');
    if (headerMount) headerMount.innerHTML = Header({ currentUser: store.currentUser, filters, searchQuery });
    const heroMount = document.getElementById('hero-mount');
    if (heroMount) heroMount.innerHTML = (currentView === 'home' && !searchQuery) ? HeroCarousel({ currentView, prompts: store.prompts }) : '';

    const profileMount = document.getElementById('profile-mount');
    if (profileMount) {
        if (currentView === 'profile') {
            profileMount.style.display = 'block';
            profileMount.innerHTML = ProfileHeader({ currentView, profileUser, currentUser: store.currentUser, profileTab });
        } else {
            profileMount.style.display = 'none';
        }
    }

    const galleryMount = document.getElementById('main-gallery-container');
    if (galleryMount) {
        galleryMount.innerHTML = Gallery({
            prompts: getFilteredPrompts(),
            currentUser: store.currentUser,
            currentView,
            profileUser,
            profileTab,
            filters,
            getModeration: getModeration, // Passed from utils import
            topCreatorsList
        });
    }

    attachEvents();

    // Solo scrollear arriba si no es un render incremental por reaccion
    if (!window._isIncrementalRender) {
        window.scrollTo(0, 0);
    }
    window._isIncrementalRender = false;
};
window.render = render;

const attachEvents = () => {
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        if (window.handleSearchTyping) window.handleSearchTyping(e.target.value);
    });
    document.getElementById('addBtn')?.addEventListener('click', () => {
        window.selectedTags.clear();
        window.renderTagSelector();
        document.getElementById('createModal').style.display = 'flex';
    });
    document.getElementById('loginBtn')?.addEventListener('click', () => { document.getElementById('authModal').style.display = 'flex'; });

    // Event delegation para clicks en posts: REMOVED from here to avoid duplication.
    // See global listener below.
};

// Global Listener for Post Clicks (Run once)
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-post-id]');
    if (target) {
        const postId = target.getAttribute('data-post-id');
        if (postId) {
            if (typeof window.openDetail === 'function') {
                window.openDetail(postId);
            } else {
                console.error("window.openDetail is not a function");
                alert("Error crítico: La función de detalle no está cargada.");
            }
        }
    }
});








// Funciones para abrir modal de auth desde botones de paywall


// Función para mostrar celebración de tokens

// --- TOAST SYSTEM ---
window.toast = toast;

// --- CONFIRM SYSTEM ---
let confirmResolver = null;

window.showTokenCelebration = showTokenCelebration;

window.setProfileView = (username) => {
    window.openUserProfile(username);
};

window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};


window.doFollow = async (username, fromDetail = false) => {
    if (!store.currentUser) return window.openLogin();
    await store.followUser(username);

    if (fromDetail) {
        const target = null; // Fix: store.users no existe
        const isFollowing = target && store.currentUser.following?.includes(target.id);
        const btn = document.getElementById('detFollowBtn');
        if (btn) btn.innerText = isFollowing ? 'Siguiendo' : 'Seguir';
        if (currentView === 'profile' && profileUser === username) render();
    } else {
        render();
    }
};



// HELPER: Validate if file is an image
// isImageFile imported

window.submitSupport = async () => {
    const name = document.getElementById('supName').value;
    const email = document.getElementById('supEmail').value;
    const msg = document.getElementById('supMsg').value;

    if (!name || !email || !msg) {
        if (window.toast) window.toast("Por favor completa todos los campos.", "warning");
        return;
    }

    const res = await store.addSupportTicket({ name, email, message: msg });

    if (res.success) {
        if (window.toast) window.toast("Ticket enviado correctamente. Te contactaremos pronto.", "success");
        window.closeModals();
    } else {
        if (window.toast) window.toast(res.msg || "Error al enviar ticket", "error");
    }
};


// window.postComm ahora es wrapper arriba

window.goHome = () => {
    currentView = 'home';
    profileUser = null;
    // Reset Filters to Community default (Complete Object)
    filters = {
        source: 'community',
        time: 'all',
        sort: 'newest',
        tool: 'all',
        rating: 'all',
        refFilter: 'all'
    };
    render();
};
// --- IMPORTED FUNCTIONS --
// Ensure these are imported from their respective files if not already.
// openInfo is imported from ./components/Legal.js
// openCreate needs to be exposed from CreateModal logic (or defined here if it was inline)

// --- EXPOSING FUNCTIONS TO WINDOW (MODULE FIX) ---
window.render = render;
window.setFilter = (key, value) => {
    if (!store.currentUser && (key === 'source' || key === 'rating')) {
        alert("Debes iniciar sesión para usar este filtro.");
        render();
        return;
    }
    filters[key] = value;
    render();
};
window.setProfileView = (username) => {
    window.openUserProfile(username);
};
window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};
window.goHome = () => {
    currentView = 'home';
    searchQuery = '';
    filters.source = 'community';
    render();
};

// Legal
window.openInfo = (type) => {
    const modal = document.getElementById('infoModal');
    const content = document.getElementById('infoContent');

    if (!modal || !content) return;

    if (LEGAL_TEXTS[type]) {
        content.innerHTML = LEGAL_TEXTS[type];
        // Force critical styles to ensure visibility
        modal.style.display = 'flex';
        modal.style.zIndex = '999999';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    } else {
        alert("Sección no encontrada: " + type);
    }
};

// DOM Helpers
window.previewFile = previewFile;
window.togglePass = togglePass;

// Modals
window.openCreate = () => {
    const modal = document.getElementById('createModal');
    if (modal) modal.style.display = 'flex';
};

window.openDetail = (id) => {
    // Check if DetailModal is loaded logic or if we need to manually trigger it.
    // In previous main.js, openDetail was often defined to fetch prompt and open modal.
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;

    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('p', id);
    window.history.pushState({}, '', newUrl);

    // Remove existing view modal if any
    const existing = document.getElementById('viewModal');
    if (existing) existing.remove();

    // Render new modal
    // DetailModal is a pure function returning HTML string
    const modalHtml = DetailModal(p, store.currentUser);

    // Append to modals mount
    const mount = document.getElementById('modals-mount');
    if (mount) {
        // We append it rather than replace to avoid killing other modals if multiple could coexist (rare)
        // Check if we should insertAdjacentHTML or append child. 
        // string -> DOM
        mount.insertAdjacentHTML('beforeend', modalHtml);

        // Ensure it is displayed
        const newModal = document.getElementById('viewModal');
        if (newModal) {
            newModal.style.display = 'flex';
            // Trigger store logic to populate data
            store.openDetail(id);
        }
    }
};

window.closeModals = () => {
    console.log("Cerrando modales...");
    document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');

    // Clear URL param 'p'
    const url = new URL(window.location);
    if (url.searchParams.get('p')) {
        url.searchParams.delete('p');
        window.history.pushState({}, '', url);
    }

    // Dynamic Logic restored
    const dynamicTip = document.getElementById('dynamicTipModal');
    if (dynamicTip) dynamicTip.remove();

    const menu = document.getElementById('optionsMenu');
    if (menu) menu.style.display = 'none';
};

// --- ADMIN HELPERS ---
window.toggleAdminSort = (col) => {
    if (window.adminSort.col === col) {
        window.adminSort.dir = window.adminSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window.adminSort.col = col;
        window.adminSort.dir = 'asc';
    }
    // If openAdmin is not defined globally yet, we might need to expose it or ensure it's called correctly.
    // For now, assuming it's available or will be.
    if (window.openAdmin) window.openAdmin('users');
};




// --- TAGGING SYSTEM LOGIC ---
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

        // Use injected key or hardcoded as fallback for local dev
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
    // Re-render chips visual state only (performance optimization)
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

// --- GLOBAL HELPER DEFINITIONS ---
// window.openInfo already assigned

let currentTipPostId = null;

// Initial Render
console.log("⏳ Iniciando store...");
try {
    store.init()
        .then(() => {
            console.log("✅ STORE INIT SUCCESS. Renderizando...");
            render();

            // --- TRIGGER MAINTENANCE OVERLAY ---
            if (MAINTENANCE_MODE) {
                renderMaintenance();
            }

            // --- TOKEN DETECTION (Password Reset & Email Verification) ---
            processTokens();
        })
        .catch(err => {
            console.error("❌ FATAL STORE INIT ERROR:", err);
            // Fallback render para no dejar la pantalla blanca
            alert("Error al cargar la galería: " + (err.message || "Error desconocido"));
            render();
        });
} catch (e) {
    console.error("❌ CRITICAL ERROR IN MAIN.JS:", e);
    render();
}

// Handle browser back button basic simulation
window.onpopstate = () => {
    if (currentView !== 'home') {
        window.goHome();
    }
};



window.startMigration = async () => {
    const statusEl = document.getElementById('migrateStatus');
    const barEl = document.getElementById('migrateBar');
    const progContainer = document.getElementById('migrateProgress');
    const btn = document.getElementById('btnStartMigrate');

    btn.disabled = true;
    btn.innerText = "⏳ Migrando...";
    progContainer.style.display = 'block';

    let keepGoing = true;
    let sessionIgnored = [];
    let initialCount = -1;
    let totalMigrated = 0;

    while (keepGoing) {
        statusEl.innerText = "🔍 Analizando base de datos...";

        const result = await store.migrateOldImages((current, batchTotal, title, totalPending) => {
            if (initialCount === -1 && totalPending) {
                initialCount = totalPending;
                console.log(`📊 Total a migrar: ${initialCount} posts`);
            }

            let pct = 0;
            if (initialCount > 0) {
                const done = initialCount - totalPending;
                pct = (done / initialCount) * 100;
            }

            statusEl.innerText = `📥 Migrando "${title}"... (Quedan ${totalPending})`;
            barEl.style.width = `${Math.min(pct, 100)}%`;
        }, sessionIgnored);

        if (result.fatal) {
            statusEl.innerText = "❌ Error Crítico: " + result.fatal;
            alert("Error crítico en la migración:\\n" + result.fatal);
            keepGoing = false;
        } else if (result.done || result.totalPending === 0) {
            keepGoing = false;
            statusEl.innerText = "✅ ¡Migración Completada!";
            barEl.style.width = '100%';

            const summary = `✅ Migración Finalizada\n\n` +
                `Total migrado: ${totalMigrated + result.count} posts\n` +
                (sessionIgnored.length > 0 ? `Ignorados(errores): ${sessionIgnored.length} \n` : '') +
                `\nTodos tus posts están ahora en Cloudinary.`;

            alert(summary);

            setTimeout(() => {
                window.closeModals();
                window.location.reload();
            }, 1000);
        } else {
            totalMigrated += result.count;

            if (result.failedIds && result.failedIds.length > 0) {
                sessionIgnored = [...sessionIgnored, ...result.failedIds];
                console.warn(`⚠️ ${result.failedIds.length} posts fallaron en este lote`);
            }

            statusEl.innerText = `✅ Lote completado(${result.count} migrados).Continuando...`;
            await new Promise(r => setTimeout(r, 500));
        }
    }

    btn.disabled = false;
    btn.innerText = "🚀 Iniciar Migración";
};

// --- INIT TOP CREATORS ---
setTimeout(() => {
    loadTopCreators();
}, 1000);

// --- TOKEN DETECTION (Password Reset & Email Verification) ---
let isProcessingTokens = false; // Guard para evitar doble ejecución
window._authToken = ''; // Cache global para el token
window._authType = '';  // 'verify' o 'password-reset'

const processTokens = async () => {
    if (isProcessingTokens) return;

    console.log("🔍 Checking for tokens in URL/Hash...");
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token');

    // DEBUG AUTH REMOVED

    let type = '';

    const hash = window.location.hash;
    console.log("📍 Window Hash:", hash);

    if (!token && hash) {
        if (hash.includes('confirm-verification')) {
            const parts = hash.split('/');
            token = parts[parts.length - 1];
            type = 'verify';
            console.log("✅ Verification token found in hash:", token);
        } else if (hash.includes('confirm-password-reset')) {
            token = hash.split('/').pop();
            type = 'password-reset';
            console.log("✅ Reset token found in hash:", token);
        }
    }

    // Helper robusto para extraer token
    const extractToken = (str) => {
        if (!str) return '';
        // Quitar slash final si existe
        let clean = str.endsWith('/') ? str.slice(0, -1) : str;
        // Obtener último segmento
        let token = clean.split('/').pop();
        // Limpiar query params si se colaron (ej: token?track=1)
        token = token.split('?')[0].split('#')[0];
        return token;
    };

    // NEW: Path-based detection (for history mode / non-hash routing)
    if (!token) {
        const path = window.location.pathname;
        if (path.includes('confirm-verification')) {
            token = extractToken(path);
            type = 'verify';
        } else if (path.includes('confirm-password-reset')) {
            token = extractToken(path);
            type = 'password-reset';
        }
    }

    if (token) {
        window._authToken = token; // Guardar para el submit posterior
        window._authType = type;

        isProcessingTokens = true; // Bloquear nuevas ejecuciones
        console.log(`🔐 Token detectado [${type || 'auto'}]. Procesando...`);

        if (type === 'verify') {
            const res = await store.confirmVerification(token);
            console.log("📡 Respuesta de verificación:", res);
            if (res.success) {
                toast("✅ ¡Cuenta verificada con éxito! Bienvenido a la comunidad.✨", "success");

                // Limpiar URL
                window.location.hash = '';

                // Abrir el modal de login automáticamente tras un breve delay para que se lea el toast
                let loginAttempts = 0;
                setTimeout(() => {
                    const tryOpenLogin = () => {
                        const modal = document.getElementById('authModal');
                        if (modal) {
                            window.toggleAuth('log');
                            modal.style.display = 'flex';
                        } else if (loginAttempts < 10) {
                            loginAttempts++;
                            setTimeout(tryOpenLogin, 300);
                        }
                    };
                    tryOpenLogin();
                }, 1500);

            } else {
                toast("❌ " + res.msg, "error");
                window.location.hash = '';
                isProcessingTokens = false;
            }
        }
        else {
            // Password Reset o Activación manual
            let modalAttempts = 0;
            const tryOpenAuth = () => {
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.style.display = 'flex';
                    window.toggleAuth('act');

                    // Personalizar textos si es un reset
                    if (type === 'password-reset') {
                        const titleEl = document.getElementById('actTitle');
                        const descEl = document.getElementById('actDesc');
                        if (titleEl) titleEl.innerText = "Nueva Contraseña";
                        if (descEl) descEl.innerText = "Introduce tu usuario y la nueva contraseña que deseas usar.";
                        const btnEl = document.querySelector('#activateForm .btn');
                        if (btnEl) btnEl.innerText = "Cambiar y Entrar";
                    }
                } else if (modalAttempts < 15) { // Intentar durante ~4.5 segundos
                    modalAttempts++;
                    setTimeout(tryOpenAuth, 300);
                } else {
                    console.error("❌ No se pudo encontrar el authModal tras varios intentos.");
                    isProcessingTokens = false;
                }
            };
            tryOpenAuth();
        }
    }
};

window.addEventListener('load', processTokens);
