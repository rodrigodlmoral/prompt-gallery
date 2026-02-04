import './style.css'
import { store } from './store.js'

const app = document.getElementById('profile-app');

// --- STATE ---
let profileUser = new URLSearchParams(window.location.search).get('u') || '';
let profileTab = 'creations';
let searchQuery = '';
let filters = { source: 'community', sort: 'newest', time: 'all', tool: 'all', refFilter: 'all', rating: 'all' };

// --- HELPERS ---
window.escapeHTML = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// --- MODERATION LOGIC (Replicated from main.js) ---
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
const LEVEL_REQS = [
    { posts: 0, name: 'Explorador', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'], icon: '🛡️', color: '#888' },
    { posts: 10, name: 'Iniciado', benefits: ['Publicar Secuencias (Multi-imagen)', 'Acceso a retos semanales'], icon: '🎖️', color: '#4caf50' },
    { posts: 25, name: 'Principiante', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'], icon: '🏅', color: '#2196f3' },
    { posts: 50, name: 'Contribuidor', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'], icon: '🥇', color: '#ff9800' },
    { posts: 100, name: 'Autor', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'], icon: '💎', color: '#9c27b0' },
    { posts: 250, name: 'COLABORADOR', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'], icon: '✨', color: 'gold' }
];

// --- COMPONENTS (Copy/Paste from main.js for now to avoid breaking main feed) ---
const Header = () => `
<header style="height:auto; display:flex; flex-direction:column">
    <div class="container" style="height:72px; border-bottom:1px solid #222">
        <div class="logo" onclick="window.location.href='/'" style="cursor:pointer">✨ Prompt Gallery</div>
        
        <div class="search-bar search-desktop">
            <input type="search" class="search-input" id="searchInput" autocomplete="off" placeholder="Buscar..." value="${searchQuery}" readonly>
        </div>

        <nav>
            ${store.currentUser ? `
                ${store.currentUser.role === 'admin' ? `<a href="/admin.html" class="btn-outline" style="border-color:gold; color:gold; text-decoration:none; padding: 10px 15px; border-radius: 8px; font-weight: 600;">👑 Admin</a>` : ''}
                <button class="btn" id="addBtn" onclick="window.location.href='/'">Compartir Prompt</button>
                <div class="user-info" onclick="window.location.href='/profile.html?u=${store.currentUser.username}'" style="cursor:pointer">
                    <div class="user-avatar-sm" style="background-image:url('${store.currentUser.avatar || 'https://robohash.org/' + store.currentUser.username}')"></div>
                    <span>${store.currentUser.username}</span>
                </div>
                <button class="btn-outline" onclick="window.doLogout()">Salir</button>
            ` : `<button class="btn" onclick="window.location.href='/'">Iniciar Sesión</button>`}
        </nav>
    </div>
</header>`;

const ProfileHeader = () => {
    if (!profileUser) return '';
    let user = store.users.find(u => u.username === profileUser);
    if (!user) return `<div class="container" style="padding:100px; text-align:center"><h2>Cargando perfil...</h2></div>`;

    const isMe = store.currentUser && store.currentUser.username === user.username;
    const getLevelInfo = (lvl) => LEVEL_REQS[lvl] || LEVEL_REQS[0];
    const lvlInfo = getLevelInfo(user.level || 0);

    return `
    <div class="profile-header">
        <div class="container" style="padding: 40px 0 0 0;">
            <div style="display:flex; gap:30px; align-items:center; margin-bottom:30px">
                <div class="user-avatar-lg" style="background-image:url('${user.avatar || 'https://robohash.org/' + user.username}')"></div>
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px">
                        <h1 style="font-size:2.5rem; margin:0">${window.escapeHTML(user.username)}</h1>
                        <span class="level-badge tier-${user.level || 0}" title="Nivel ${user.level || 0}">
                            ${lvlInfo.icon} NIVEL ${user.level || 0} - ${lvlInfo.name}
                        </span>
                    </div>

                    <div style="display:flex; gap:20px; color:#888; font-size:0.9rem; align-items:center">
                        <div class="token-display">💎 ${user.tokens || 0} PromptBits</div>
                        <span>|</span>
                        <span>${user.followers?.length || 0} Seguidores</span>
                        <span>${user.following?.length || 0} Siguiendo</span>
                    </div>
                    
                    ${!isMe ? `<button class="btn" style="margin-top:15px">Seguir</button>`
            : `<button class="btn-outline" style="margin-top:15px">⚙️ Configurar Perfil</button>`}
                </div>
            </div>
            <div style="display:flex; gap:20px; border-bottom:1px solid #333">
                <button class="profile-tab ${profileTab === 'creations' ? 'active' : ''}" onclick="window.setProfileTab('creations')">Creaciones</button>
                ${isMe ? `<button class="profile-tab ${profileTab === 'saved' ? 'active' : ''}" onclick="window.setProfileTab('saved')">Guardados</button>` : ''}
            </div>
        </div>
    </div>`;
};

const Gallery = () => {
    let list = [...store.prompts].filter(p => {
        if (p.isPrivate && (!store.currentUser || store.currentUser.username !== p.author)) return false;
        return profileTab === 'creations' ? p.author === profileUser : p.savedBy?.includes(profileUser);
    });

    if (list.length === 0) return `<div class="container" style="padding:100px; text-align:center; color:#666">No hay prompts aquí todavía.</div>`;

    return `
    <div class="container gallery-grid" style="margin-top:20px">
        ${list.map(p => `
            <div class="prompt-card" data-post-id="${p.id}">
                <div class="card-img-wrapper">
                    <img src="${p.image}" loading="lazy">
                </div>
                <div class="card-info">
                    <div class="card-title">${window.escapeHTML(p.title)}</div>
                    <div class="card-author">por @${p.author}</div>
                </div>
            </div>
        `).join('')}
    </div>`;
};

// --- LOGIC ---
const render = () => {
    app.innerHTML = Header() + ProfileHeader() + Gallery();
};

window.setProfileTab = (tab) => {
    profileTab = tab;
    render();
};

const init = async () => {
    await store.init();
    if (profileUser) {
        await store.fetchUserProfileByUsername(profileUser);
    }
    render();
};

init();
