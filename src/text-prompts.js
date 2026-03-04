import './style.css';
import { store } from './store-final.js';
import { TopBar, Header } from './components/Layout.js';
import { escapeHTML } from './utils/security.js';
import { toast } from './utils/ui-helpers.js';

window.escapeHTML = escapeHTML;
window.toast = toast;

import { pb } from './pocketbase.js';

// ---- STATE ----
let textPrompts = [];
let isLoading = true;

async function loadTextPrompts() {
    try {
        const result = await pb.collection('text_prompts').getList(1, 50, {
            sort: '-id',
            expand: 'author'
        });
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

    gridContainer.innerHTML = textPrompts.map(p => TextPromptCard(p)).join('');
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
                        <option value="💻 Código">💻 Código</option>
                        <option value="✍️ Marketing">✍️ Marketing</option>
                        <option value="🗣️ Idiomas">🗣️ Idiomas</option>
                        <option value="📄 Documentos">📄 Documentos</option>
                        <option value="🎨 Creatividad">🎨 Creatividad</option>
                        <option value="📊 Negocios">📊 Negocios</option>
                        <option value="🧠 Educación">🧠 Educación</option>
                        <option value="🤖 Chatbot">🤖 Chatbot</option>
                        <option value="🔧 Productividad">🔧 Productividad</option>
                        <option value="📱 Redes Sociales">📱 Redes Sociales</option>
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

// ---- ISOLATED DETAIL MODAL FOR TEXT PROMPTS ----
const TextDetailModalTemplate = () => `
<style>
    @media (max-width: 768px) {
        .txt-detail-columns { flex-direction: column !important; }
        .txt-detail-right { border-left: none !important; border-top: 1px solid #222 !important; min-width: unset !important; width: 100% !important; }
    }
    .premium-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.4); border-radius: 10px; }
    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.8); }
</style>
<div id="textModalOverlay" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeTextModal()">
    <div class="view-modal-wrapper" style="max-width: 1400px; margin: 2vh auto; width: 96%;">
        <div class="view-modal" style="flex-direction: column; height: auto !important; max-height: 96vh; overflow: hidden; border-radius: 16px;">
            <button class="modal-close-x" onclick="window.closeTextModal()">✕</button>
            
            <div class="txt-detail-columns" style="display: flex; flex: 1; overflow: hidden;">
                <!-- LEFT: Main prompt content (Statically sized, internal scroll only) -->
                <div style="flex: 1; padding: 25px 35px; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="flex: 0 0 auto;">
                        <div id="txtMetaTop" style="font-size:0.65rem; color:#a855f7; font-weight:800; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); display:inline-block; padding: 4px 10px; border-radius: 12px;">CATEGORÍA</div>
                        
                        <h2 id="txtTitle" style="margin:0 0 10px 0; font-size: 1.8rem;">Título del Prompt</h2>
                        <div id="txtUser" style="font-weight:700; margin-bottom:15px; color:#cbd5e1; cursor:pointer">por @autor</div>
                        <p id="txtDesc" style="color: #94a3b8; line-height: 1.6; margin-bottom: 20px; font-size: 1rem;"></p>
                    </div>
                    
                    <div style="position:relative; flex: 1; display: flex; flex-direction: column; min-height: 0;">
                        <div style="flex: 0 0 auto; display:flex; justify-content:space-between; align-items:center; background: #000; padding: 10px 15px; border-top-left-radius: 8px; border-top-right-radius: 8px; border: 1px solid #333; border-bottom: none;">
                            <span style="color:#666; font-family:monospace; font-size:0.8rem;">Prompt Estructurado</span>
                            <span id="txtCopyCountBadge" style="color:var(--accent); font-weight:700; font-size: 0.8rem;">📋 Copiado 0 veces</span>
                        </div>
                        <div id="txtPrompt" class="prompt-area premium-scroll" style="flex: 1; background:#0a0a0a; font-family: monospace; white-space: pre-wrap; font-size:0.9rem; line-height: 1.6; color: #a855f7; border-radius: 0; overflow-y: auto; border: 1px solid #333; user-select: none; -webkit-user-select: none; margin: 0; min-height: 100px;"></div>
                        
                        <div style="flex: 0 0 auto; margin-top:15px">
                            <button class="btn" onclick="window.doCopyTextPrompt()" style="width:100%; background: linear-gradient(135deg, #a855f7, #6366f1); border:none; padding:14px; font-size:1.05rem; font-weight:bold;">📋 COPIAR PROMPT AL PORTAPAPELES</button>
                        </div>
                    </div>
                    
                    <div class="reactions-flex" style="flex: 0 0 auto; margin-top: 15px;">
                        <button class="react-btn">👍 <small id="txt-like-count">0</small></button>
                        <button class="react-btn">❤️ <small id="txt-love-count">0</small></button>
                        <button class="react-btn">🔥 <small id="txt-fire-count">0</small></button>
                        <button class="react-btn">😂 <small id="txt-funny-count">0</small></button>
                        <button class="react-btn">👎 <small id="txt-dislike-count">0</small></button>
                        <button class="react-btn">😢 <small id="txt-sad-count">0</small></button>
                    </div>
                </div>
                
                <!-- RIGHT: Comments sidebar (desktop) -->
                <div class="txt-detail-right premium-scroll" style="min-width: 350px; width: 350px; border-left: 1px solid #222; padding: 30px 25px; display: flex; flex-direction: column;">
                    <h3 style="font-size:1.1rem; margin: 0 0 15px 0;">💬 Comentarios</h3>
                    
                    <div id="txtComments" class="premium-scroll" style="flex: 1; overflow-y: auto; margin-bottom: 20px; padding-right: 5px;">
                        <!-- JS injected comments will appear here -->
                    </div>
                    
                    <div class="view-footer" style="margin-top: auto; padding-top: 15px; border-top: 1px solid #222;">
                        <div id="txtCommAntiBot" class="comment-anti-bot-container" style="display:none; margin-bottom: 10px;">
                            <div class="crystal-slider-wrapper" id="txtCommSlider">
                                <div class="crystal-slider-track-text">Desliza 💎 para confirmar</div>
                                <div class="crystal-slider-handle" id="txtCommSliderHandle">💎</div>
                            </div>
                            <!-- Honeypot -->
                            <input type="text" name="b_name" class="hp-field" id="txtCommHoneypot" tabindex="-1" autocomplete="off" style="display:none;">
                        </div>

                        <div style="display:flex; gap:10px;">
                            <input type="text" id="txtCommInput" class="form-input" style="flex:1" placeholder="Comenta..." onfocus="window.showTextSlider()">
                            <button class="btn" id="txtCommSubmitBtn" onclick="window.postTextComm()">Enviar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

// ---- LOGIC EVENT HANDLERS ----
let activeTextPromptId = null;

// Attach globally
window.openTextDetail = async (id) => {
    let promptData = textPrompts.find(p => p.id === id); // Use real data
    if (!promptData) {
        try {
            document.body.style.cursor = 'wait';
            promptData = await pb.collection('text_prompts').getOne(id, { expand: 'author' });
            document.body.style.cursor = 'default';
        } catch (err) {
            console.error(err);
            document.body.style.cursor = 'default';
            if (window.toast) window.toast("Error cargar prompt o no encontrado", "error");
            return;
        }
    }
    if (!promptData) return;
    activeTextPromptId = id;

    // Fill data
    document.getElementById('txtMetaTop').innerText = promptData.category || 'Categoría';
    document.getElementById('txtTitle').innerText = promptData.title || '';

    // Resolve author name from expand relation, fallback to author_name cache, fallback to ID
    const authorUsername = promptData.expand?.author?.username || promptData.author_name || promptData.author;
    document.getElementById('txtUser').innerHTML = `por <span style="color:var(--accent);">@${window.escapeHTML(authorUsername)}</span>`;

    document.getElementById('txtDesc').innerText = promptData.description || '';
    document.getElementById('txtPrompt').innerText = promptData.prompt_text || '';
    document.getElementById('txtCopyCountBadge').innerText = `📋 Copiado ${promptData.copy_count || 0} veces`;

    // Fill stats safely
    const reactions = promptData.reactions || { like: 0, love: 0, fire: 0, funny: 0, dislike: 0, sad: 0 };
    document.getElementById('txt-like-count').innerText = reactions.like || 0;
    document.getElementById('txt-love-count').innerText = reactions.love || 0;
    document.getElementById('txt-fire-count').innerText = reactions.fire || 0;
    document.getElementById('txt-funny-count').innerText = reactions.funny || 0;
    document.getElementById('txt-dislike-count').innerText = reactions.dislike || 0;
    document.getElementById('txt-sad-count').innerText = reactions.sad || 0;

    // Render Comments
    const commentsEl = document.getElementById('txtComments');
    if (commentsEl) {
        const currUser = store.currentUser?.username;
        const isPostOwner = currUser === authorUsername;

        commentsEl.innerHTML = (promptData.comments && promptData.comments.length > 0)
            ? promptData.comments.map(c => `<div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--accent); position:relative">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                        <span style="font-weight:700; color:var(--accent); font-size:0.85rem">@${window.escapeHTML(c.user || c.username)}</span>
                        ${(isPostOwner || currUser === c.user || currUser === c.username) ? `<button onclick="window.doDeleteTextComment('${c.id || c.date}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem; padding:0">🗑️</button>` : ''}
                    </div>
                    <div style="font-size:0.9rem; color:#eee; word-break:break-word">${window.escapeHTML(c.text)}</div>
                </div>`).join('')
            : '<div style="opacity:0.5; font-size:0.9rem; text-align:center; margin-top: 20px;">No hay comentarios aún.</div>';
    }

    // Show modal
    document.getElementById('textModalOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Stop background scrolling
};

window.closeTextModal = () => {
    document.getElementById('textModalOverlay').style.display = 'none';
    document.body.style.overflow = '';
    activeTextPromptId = null;
};

window.doCopyTextPrompt = async () => {
    if (!activeTextPromptId) return;
    const promptData = textPrompts.find(p => p.id === activeTextPromptId);
    if (!promptData) return;

    try {
        await navigator.clipboard.writeText(promptData.prompt_text);

        // Actual DB Update for copy_count
        const newCopyCount = (promptData.copy_count || 0) + 1;

        // Optimistic UI update
        promptData.copy_count = newCopyCount;
        document.getElementById('txtCopyCountBadge').innerText = `📋 Copiado ${newCopyCount} veces`;

        if (window.toast) {
            window.toast("¡Prompt Copiado Exitosamente!", "success");
        } else {
            alert("✅ ¡Prompt copiado al portapapeles!");
        }

        // Send to PocketBase in background
        try {
            await pb.collection('text_prompts').update(activeTextPromptId, {
                copy_count: newCopyCount
            });
        } catch (dbErr) {
            console.error("Error updating copy_count in DB", dbErr);
        }

    } catch (e) {
        console.error("Error copiando txt", e);
        if (window.toast) window.toast("Error al copiar al portapapeles", "error");
    }
};

window.showTextSlider = () => {
    document.getElementById('txtCommAntiBot').style.display = 'block';
    window.initTextCrystalSlider();
};

let textSliderUnlocked = false;
window.initTextCrystalSlider = () => {
    textSliderUnlocked = false;
    const track = document.getElementById('txtCommSlider');
    const handle = document.getElementById('txtCommSliderHandle');
    if (!track || !handle) return;
    track.classList.remove('unlocked');
    handle.style.left = '4px';
    handle.style.transition = 'left 0.3s ease';

    let isDragging = false;
    let startX = 0;

    const onStart = (e) => {
        if (textSliderUnlocked) return;
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        handle.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging || textSliderUnlocked) return;
        const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const diff = currentX - startX;
        const max = track.offsetWidth - handle.offsetWidth - 8;
        const pos = Math.max(0, Math.min(diff, max));
        handle.style.left = (pos + 4) + 'px';

        if (pos >= max - 5) {
            textSliderUnlocked = true;
            isDragging = false;
            track.classList.add('unlocked');
            handle.style.left = 'calc(100% - 44px)';
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        if (!textSliderUnlocked) {
            handle.style.transition = 'left 0.3s ease';
            handle.style.left = '4px';
        }
    };

    handle.onmousedown = onStart;
    handle.ontouchstart = onStart;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
};

window.postTextComm = async () => {
    if (!store.currentUser) {
        if (window.toast) window.toast("Debes iniciar sesión para comentar", "error");
        return;
    }

    const levelCheck = store.checkLevelFeature('comment');
    if (!levelCheck.hasAccess) {
        if (window.toast) window.toast(levelCheck.message, 'warning');
        return;
    }

    const input = document.getElementById('txtCommInput');
    const val = input ? input.value.trim() : '';

    if (!val) return;
    if (val.length < 5) {
        if (window.toast) window.toast("Comentario demasiado corto", "info");
        return;
    }

    const honeypot = document.getElementById('txtCommHoneypot');
    if (honeypot && honeypot.value) {
        console.warn('Bot detectado al comentar (text_prompts)');
        return; // Silent fail block for bots
    }

    if (!textSliderUnlocked) {
        if (window.toast) window.toast("Desliza el diamante 💎 para verificar que eres humano", "info");
        return;
    }

    const result = await store.addTextComment(activeTextPromptId, val);

    if (result.success) {
        if (window.toast) window.toast("¡Comentario enviado con éxito!", "success");
        if (input) input.value = '';

        textSliderUnlocked = false;
        const track = document.getElementById('txtCommSlider');
        const handle = document.getElementById('txtCommSliderHandle');
        const bot = document.getElementById('txtCommAntiBot');
        if (track) track.classList.remove('unlocked');
        if (handle) { handle.style.left = '4px'; handle.style.transition = 'none'; }
        if (bot) bot.style.display = 'none';

        // Update local array synchronously so rendering picks it up
        const promptIndex = textPrompts.findIndex(p => p.id === activeTextPromptId);
        if (promptIndex !== -1) {
            // Re-fetch to get accurate comments array, or just re-render to trigger reactivity
            // The store already updated the passed prompt reference!
            window.openTextDetail(activeTextPromptId);
        }
    } else {
        if (window.toast) window.toast(result.msg || "Error al comentar", "error");
    }
};

window.doDeleteTextComment = async (commentId) => {
    if (!store.currentUser) return;
    if (confirm("¿Seguro que quieres eliminar este comentario?")) {
        const res = await store.removeTextComment(activeTextPromptId, commentId);
        if (res.success) {
            const promptIndex = textPrompts.findIndex(p => p.id === activeTextPromptId);
            if (promptIndex !== -1) {
                window.openTextDetail(activeTextPromptId);
            }
        }
    }
};

async function initPage() {
    console.log("🚀 Starting Text Prompts Init...");
    try {
        window.store = store; // Expose globally for compatibility
        console.log("Awaiting store.init()...");
        await store.init();
        console.log("store.init() completed!");

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
            <div class="container" style="padding: 40px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px;">
                    <div>
                        <h2>Galería de Prompts de Texto</h2>
                        <p style="color:#94a3b8; font-size:0.9rem;">Chatbots, escritura, código e instrucciones complejas.</p>
                    </div>
                </div>
                
                <!-- Dynamic Grid Container -->
                <div class="gallery-grid" id="text-gallery-grid-container">
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

// Start immediately, no DOMContentLoaded wait needed for deferred modules
initPage();
