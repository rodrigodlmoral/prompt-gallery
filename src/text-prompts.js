import './style.css';
import { store } from './store-final.js';
import { TopBar, Header } from './components/Layout.js';
import { TextDetailModalTemplate, initTextModalLogic, activeTextPromptId } from './components/TextDetailModal.js';
import { escapeHTML } from './utils/security.js';
import { toast } from './utils/ui-helpers.js';

window.escapeHTML = escapeHTML;
window.toast = toast;

import { pb } from './pocketbase.js';

// ---- STATE ----
let textPrompts = [];
let isLoading = true;

let textFilters = {
    source: 'community',
    time: 'all',
    sort: 'newest'
};

async function loadTextPrompts() {
    isLoading = true;
    renderGalleryGrid(); // Show loading state

    try {
        let filterStr = '';
        const filterParts = [];
        const currentUser = store.currentUser;

        // 1. Source Filter
        if (textFilters.source === 'user' && currentUser) {
            filterParts.push(`author = "${currentUser.id}"`);
        } else if (textFilters.source === 'following' && currentUser && currentUser.following?.length > 0) {
            const authorIds = currentUser.following.map(id => `"${id}"`).join(',');
            filterParts.push(`author ?= [${authorIds}]`);
        }

        // 2. Time Filter
        if (textFilters.time !== 'all') {
            const now = new Date();
            let pastDate = new Date();
            if (textFilters.time === 'today') {
                pastDate.setHours(0, 0, 0, 0); // Start of today
            } else if (textFilters.time === 'week') {
                pastDate.setDate(now.getDate() - 7);
            } else if (textFilters.time === 'month') {
                pastDate.setMonth(now.getMonth() - 1);
            }
            // PocketBase expects UTC format "YYYY-MM-DD HH:mm:ss.SSSZ"
            filterParts.push(`created >= "${pastDate.toISOString().replace('T', ' ')}"`);
        }

        if (filterParts.length > 0) {
            filterStr = filterParts.join(' && ');
        }

        // 3. Sorting
        let sortStr = '-id';
        if (textFilters.sort === 'popular') {
            sortStr = '-tokens_received,-id'; // Best approximation without complex relations
        } else if (textFilters.sort === 'commented') {
            sortStr = '-copy_count,-id';
        } else if (textFilters.sort === 'oldest') {
            sortStr = '+id';
        }

        const queryParams = {
            sort: sortStr,
            expand: 'author'
        };

        if (filterStr) {
            queryParams.filter = filterStr;
        }

        const result = await pb.collection('text_prompts').getList(1, 100, queryParams);

        textPrompts = result.items;
        isLoading = false;
        renderGalleryGrid();
    } catch (err) {
        console.error("Error loading text prompts:", err);
        isLoading = false;
        if (window.toast) window.toast("Error al cargar la galería de texto", "error");
    }
}

function renderGalleryGrid() {
    const gridContainer = document.getElementById('text-gallery-grid-container');
    if (!gridContainer) return;

    if (isLoading) {
        gridContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 40px; width: 100%;">Cargando prompts de texto...</div>';
        return;
    }

    if (textPrompts.length === 0) {
        gridContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 40px; width: 100%;">Aún no hay prompts de texto publicados.</div>';
        return;
    }

    gridContainer.innerHTML = '<div class="gallery-grid">' + textPrompts.map((p, idx) => {
        const card = TextPromptCard(p);
        const adBanner = (idx > 11 && (idx + 1) % 12 === 0) ? `</div><div class="ad-banner"></div><div class="gallery-grid">` : '';
        return card + adBanner;
    }).join('') + '</div>';
}

// ---- CREATE TEXT PROMPT MODAL ----
const CreateTextPromptModal = () => `
<div id="createTextOverlay" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeCreateTextModal()">
    <div class="view-modal-wrapper" style="max-width: 850px; margin: 20px auto; width: 100%;">
        <div class="view-modal" style="flex-direction: column; padding: 40px; height: auto !important;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0; background: linear-gradient(135deg, #a855f7, #6366f1); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">📝 Compartir Prompt de Texto</h2>
                <button onclick="window.closeCreateTextModal()" style="background: rgba(255,255,255,0.05); border: 1px solid #333; color: #999; padding: 8px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,60,60,0.15)'; this.style.color='#ff6b6b'; this.style.borderColor='#ff6b6b'" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#999'; this.style.borderColor='#333'">✕ CERRAR</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div>
                    <label style="color:#94a3b8; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; display:block;">Título *</label>
                    <input id="txtCreateTitle" type="text" placeholder="Ej: Tutor de Inglés Nativo" maxlength="200" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px 16px; border-radius:8px; font-size:1rem; outline:none; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="color:#94a3b8; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; display:block;">Descripción corta *</label>
                    <textarea id="txtCreateDesc" placeholder="Explica brevemente qué hace este prompt..." maxlength="500" rows="2" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px 16px; border-radius:8px; font-size:0.95rem; outline:none; resize:vertical; box-sizing: border-box;"></textarea>
                </div>
                
                <div>
                    <label style="color:#94a3b8; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; display:block;">Categoría *</label>
                    <select id="txtCreateCategory" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px 16px; border-radius:8px; font-size:0.95rem; outline:none; box-sizing: border-box;">
                        <option value="">Selecciona una categoría</option>
                        <option value="Código">💻 Código</option>
                        <option value="Marketing">✍️ Marketing</option>
                        <option value="Idiomas">🗣️ Idiomas</option>
                        <option value="Documentos">📄 Documentos</option>
                        <option value="Creatividad">🎨 Creatividad</option>
                        <option value="Negocios">📊 Negocios</option>
                        <option value="Educación">🧠 Educación</option>
                        <option value="Chatbot">🤖 Chatbot</option>
                        <option value="Productividad">🔧 Productividad</option>
                        <option value="Redes Sociales">📱 Redes Sociales</option>
                    </select>
                </div>

                <div>
                    <label style="color:#94a3b8; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; display:block;">Herramienta</label>
                    <select id="txtCreateTool" style="width:100%; background:#111; border:1px solid #333; color:#fff; padding:12px 16px; border-radius:8px; font-size:0.95rem; outline:none; box-sizing: border-box;">
                        <option value="">Selecciona una herramienta (opcional)</option>
                        <option value="ChatGPT">🟢 ChatGPT</option>
                        <option value="Gemini">🔵 Gemini</option>
                        <option value="Grok">⚡ Grok</option>
                        <option value="Claude">🟠 Claude</option>
                        <option value="Perplexity">🟣 Perplexity</option>
                    </select>
                </div>
                
                <div>
                    <label style="color:#94a3b8; font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; display:block;">Texto del Prompt *</label>
                    <textarea id="txtCreatePrompt" placeholder="Escribe aquí el prompt completo que los usuarios podrán copiar..." maxlength="10000" rows="4" style="width:100%; background:#0a0a0a; border:1px solid #333; color:#a855f7; padding:12px 16px; border-radius:8px; font-family:monospace; font-size:0.9rem; outline:none; resize:vertical; line-height:1.6; box-sizing: border-box;"></textarea>
                </div>
                
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding: 8px 0;">
                    <input id="txtCreatePrivate" type="checkbox" style="width:18px; height:18px; accent-color:#a855f7; cursor:pointer;">
                    <span style="color:#94a3b8; font-size:0.9rem;">🔒 Hacer este prompt <strong style="color:#fff;">privado</strong> (solo yo puedo verlo)</span>
                </label>
                
                <button id="txtPublishBtn" class="btn" onclick="window.doPublishTextPrompt()" style="width:100%; background: linear-gradient(135deg, #a855f7, #6366f1); border:none; padding:15px; font-size:1.1rem; font-weight:bold; margin-top:10px; cursor:pointer;">🚀 PUBLICAR PROMPT DE TEXTO</button>
            </div>
        </div>
    </div>
</div>`;

window.openCreateTextModal = () => {
    document.getElementById('createTextOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeCreateTextModal = () => {
    document.getElementById('createTextOverlay').style.display = 'none';
    document.body.style.overflow = '';
};

window.doPublishTextPrompt = async () => {
    const title = document.getElementById('txtCreateTitle').value.trim();
    const description = document.getElementById('txtCreateDesc').value.trim();
    const category = document.getElementById('txtCreateCategory').value;
    const prompt_text = document.getElementById('txtCreatePrompt').value.trim();
    const tool = document.getElementById('txtCreateTool').value;
    const is_private = document.getElementById('txtCreatePrivate').checked;

    if (!title || !description || !category || !prompt_text) {
        window.toast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    const btn = document.getElementById('txtPublishBtn');
    btn.disabled = true;
    btn.innerText = '⏳ Publicando...';

    try {
        const result = await store.addTextPrompt({ title, description, category, prompt_text, tool, is_private });

        if (result.success) {
            window.toast('🎉 ¡Prompt de texto publicado exitosamente! +' + (result.tokensEarned || 1) + ' 💎', 'success');
            window.closeCreateTextModal();
            // Reload prompts
            await loadTextPrompts();
        } else {
            window.toast(result.msg || 'Error al publicar', 'error');
        }
    } catch (err) {
        console.error('Error publishing text prompt:', err);
        window.toast('Error inesperado al publicar', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = '🚀 PUBLICAR PROMPT DE TEXTO';
    }
};

// ---- HEADER COMPONENT (ISOLATED) ----
const TextDashboardHeader = ({ currentUser }) => {
    return `
    <header style="height:auto; display:flex; flex-direction:column">
        <div class="container" style="height:72px; border-bottom:1px solid #222; display:flex; align-items:center; justify-content:space-between;">
            <div class="logo" onclick="window.location.href='/'" style="cursor:pointer;">
                <span style="-webkit-text-fill-color: initial; text-shadow: 0 0 10px rgba(255,255,255,0.2);">💎</span>
                <span style="background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">PROMPT-GALLERY</span>
            </div>
            
            <nav style="display:flex; align-items:center; gap:15px;">
                ${currentUser ? `
                    <button class="btn" onclick="window.openCreateTextModal()" style="background: linear-gradient(135deg, #a855f7, #6366f1); border:none;">📝 Compartir Texto</button>
                    <div class="user-info" onclick="window.location.href='/profile.html?user=${currentUser.username}'" style="cursor:pointer; display:flex; align-items:center; gap:10px;">
                        <div class="user-avatar-sm" style="width:32px; height:32px; background-size:cover; border-radius:50%; background-image:url('${currentUser.avatar || 'https://robohash.org/' + currentUser.username}')"></div>
                        <span style="font-weight:600;">${currentUser.username}</span>
                    </div>
                ` : ''}
            </nav>
        </div>

        ${currentUser ? `
        <div class="container" style="display:flex; justify-content:flex-end; padding: 10px 0; padding-right: 15px;">
            <div style="background: rgba(0,0,0,0.4); border-radius: 20px; padding: 4px; display:flex; gap: 5px; border: 1px solid rgba(255,255,255,0.1);">
                <button style="background: transparent; color: #888; border: none; padding: 6px 16px; border-radius: 16px; font-weight: 600; cursor: pointer; font-size: 13px; transition: 0.2s;" onclick="window.location.href='/'" onmouseover="this.style.color='white'" onmouseout="this.style.color='#888'">🖼️ IMÁGENES</button>
                <button style="background: rgba(168, 85, 247, 0.2); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); padding: 5px 15px; border-radius: 16px; font-weight: 600; cursor: pointer; font-size: 13px;">📝 TEXTO</button>
            </div>
        </div>
        ` : ''}
    </header>`;
};

// ---- EXACT CLONE OF GALLERY.JS CARD FOR TEXT ----
const TextPromptCard = (p) => {
    const reactions = p.reactions || { like: 0, love: 0, fire: 0, funny: 0 };

    // Fallback counts for UI display safely
    const likeCount = reactions.like || 0;
    const fireCount = reactions.fire || 0;

    return `
    <div class="card" onclick="window.openTextDetail('${p.id}')" style="display: flex; flex-direction: column; background: #111; overflow: hidden; position: relative; height: auto !important; min-height: 280px !important; aspect-ratio: auto !important;">
        
        <!-- Background Icon -->
        <div style="position:absolute; top:-20px; right:-20px; font-size:120px; opacity:0.03; font-family:sans-serif; pointer-events:none; z-index: 0;">📝</div>

        <!-- MAIN PREVIEW AREA (Top 70%) -->
        <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 1;">
            <div style="color: #a855f7; font-size: 0.8rem; font-weight: 700; background: rgba(168, 85, 247, 0.1); padding: 4px 10px; border-radius: 12px; align-self: flex-start; border: 1px solid rgba(168, 85, 247, 0.2);">
                ${p.category}
            </div>
            
            <h3 style="margin: 0; font-size: 1.2rem; color: #fff; line-height: 1.3;">${p.title}</h3>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${p.description}
            </p>
            
            <div style="margin-top: 5px; flex: 1; padding: 12px 15px; background: rgba(0,0,0,0.5); border-radius: 6px; border: 1px inset rgba(255,255,255,0.05); font-family: monospace; font-size: 0.75rem; color: #6366f1; overflow: hidden; position: relative; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">
                <div style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; white-space: pre-wrap; word-break: break-word;">${p.prompt_text}</div>
            </div>
        </div>

        <!-- METADATA FOOTER (Bottom 30%) -->
        <div style="background: linear-gradient(0deg, rgba(8,8,8,1) 0%, rgba(17,17,17,0.8) 100%); padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.05); z-index: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size:0.8rem; opacity:0.8; color: #ccc; cursor:pointer" onclick="event.stopPropagation(); window.location.href='/profile.html?user=${p.author}'">por <span style="color: #fff; font-weight: 600;">@${window.escapeHTML(p.expand?.author?.username || p.author_name || p.author)}</span></div>
            </div>
            
            <div style="display: flex; gap: 12px; font-size: 0.8rem; font-weight: 600; color: #999;">
                ${likeCount > 0 ? `<span title="Me gusta">👍 <span style="color:#fff">${likeCount}</span></span>` : ''}
                ${fireCount > 0 ? `<span title="Fuego">🔥 <span style="color:#fff">${fireCount}</span></span>` : ''}
                <span title="Copiado">📋 <span style="color:var(--accent)">${p.copy_count || 0}</span></span>
                <span title="PromptBits" style="margin-left: auto;">💎 <span style="color:#a29bfe">${p.tokens_received || 0}</span></span>
            </div>
        </div>
    </div>`;
};

const renderGallery = () => {
    return `
    <div class="container" style="padding: 40px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px;">
            <div>
                <h2>Galería de Prompts de Texto</h2>
                <p style="color:#94a3b8; font-size:0.9rem;">Chatbots, escritura, código e instrucciones complejas.</p>
            </div>
        </div>
        <!-- Same gallery-grid from CSS -->
        <div class="gallery-grid">
            ${mockTextPrompts.map(p => TextPromptCard(p)).join('')}
        </div>
    </div>`;
};



async function initPage() {
    console.log("🚀 Starting Text Prompts Init...");
    try {
        window.store = store; // Expose globally for compatibility
        console.log("Awaiting store.init()...");
        await store.init();
        console.log("store.init() completed!");
        initTextModalLogic();

        const currentUser = store.currentUser;

        if (!currentUser) {
            // Keep the same login warning block
            document.getElementById('app').innerHTML = `
            <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#666; font-family:sans-serif">
                <div style="font-size:3rem">🔒</div>
                <p style="margin-top:20px; letter-spacing:1px; font-size:0.9rem">DEBES INICIAR SESIÓN</p>
                <button class="btn" onclick="window.location.href='/'" style="margin-top:20px">Ir al Inicio</button>
            </div>`;
            return;
        }

        const appDiv = document.getElementById('app');

        // Render Dashboard layout with Custom Header + Modals
        appDiv.innerHTML = `
            ${TopBar()}
            ${TextDashboardHeader({ currentUser })}
            <div class="container" style="padding: 40px 0 0 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h2>Galería de Prompts de Texto</h2>
                        <p style="color:#94a3b8; font-size:0.9rem;">Chatbots, escritura, código e instrucciones complejas.</p>
                    </div>
                </div>

                <!-- Basic Filters Bar -->
                <div class="filters-bar" style="padding:10px 0; display:flex; gap:8px; overflow-x:auto; align-items:center; margin-top:20px; margin-bottom: 20px;">
                    <select id="txtSourceFilter" onchange="window.setTextFilter('source', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
                        <option value="community" ${textFilters.source === 'community' ? 'selected' : ''}>👥 Comunidad</option>
                        <option value="following" ${textFilters.source === 'following' ? 'selected' : ''} ${!currentUser ? 'disabled' : ''}>⭐ Siguiendo</option>
                        <option value="user" ${textFilters.source === 'user' ? 'selected' : ''} ${!currentUser ? 'disabled' : ''}>👤 Tus Textos</option>
                    </select>
                    <select onchange="window.setTextFilter('time', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
                        <option value="all" ${textFilters.time === 'all' ? 'selected' : ''}>📅 Todo el tiempo</option>
                        <option value="today" ${textFilters.time === 'today' ? 'selected' : ''}>Hoy</option>
                        <option value="week" ${textFilters.time === 'week' ? 'selected' : ''}>Esta Semana</option>
                        <option value="month" ${textFilters.time === 'month' ? 'selected' : ''}>Este Mes</option>
                    </select>
                    <select onchange="window.setTextFilter('sort', this.value)" class="form-input" style="width:auto; padding:6px; font-size:0.85rem">
                        <option value="newest" ${textFilters.sort === 'newest' ? 'selected' : ''}>🔥 Más Recientes</option>
                        <option value="popular" ${textFilters.sort === 'popular' ? 'selected' : ''}>❤️ Más Recompensados</option>
                        <option value="commented" ${textFilters.sort === 'commented' ? 'selected' : ''}>📋 Más Copiados</option>
                        <option value="oldest" ${textFilters.sort === 'oldest' ? 'selected' : ''}>👴 Más Antiguos</option>
                    </select>
                </div>
                
                <!-- Dynamic Grid Container -->
                <div id="text-gallery-grid-container">
                    <div style="color: #666; text-align: center; padding: 40px; width: 100%;">Cargando prompts...</div>
                </div>
            </div>
            
            <div id="text-modals-mount">
                ${TextDetailModalTemplate()}
                ${CreateTextPromptModal()}
            </div>
        `;

        console.log("Rendered HTML skeleton successfully. Loading prompts...");

        // Fetch real data from PocketBase
        await loadTextPrompts();

        const urlParams = new URLSearchParams(window.location.search);
        const autoOpenId = urlParams.get('id');

        // If the modal was open (from re-render copy), pop it back up immediately
        if (activeTextPromptId) {
            window.openTextDetail(activeTextPromptId);
        } else if (autoOpenId) {
            window.openTextDetail(autoOpenId);
        }

    } catch (err) {
        console.error("❌ CRITICAL ERROR en init page text prompts:", err);
    }
}

// Global hook for the filter dropdowns
window.setTextFilter = (key, value) => {
    // Requires login for community/following
    if (key === 'source' && value !== 'community' && !store.currentUser) {
        window.toast("Debes iniciar sesión para usar este filtro", "error");
        // Revert select visually
        document.getElementById('txtSourceFilter').value = 'community';
        return;
    }
    textFilters[key] = value;
    loadTextPrompts(); // Reload data with new filters
};

// Start immediately, no DOMContentLoaded wait needed for deferred modules
initPage();
