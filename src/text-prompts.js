import './style.css';
import { store } from './store-final.js';
import { TopBar, Header } from './components/Layout.js';
import { escapeHTML } from './utils/security.js';
import { toast } from './utils/ui-helpers.js';

window.escapeHTML = escapeHTML;
window.toast = toast;

// ---- MOCK DATA ----
const mockTextPrompts = [
    {
        id: 'tp_01',
        title: 'Python FastAPI Boilerplate',
        author: 'rodrigodlmoral',
        description: 'Genera un servidor FastAPI completo con JWT auth y conexión a PostgreSQL.',
        prompt_text: 'Eres un experto en Python backend. Escribe un boilerplate de FastAPI que incluya:\n1. Autenticación con JWT.\n2. Modelos Pydantic para User.\n3. Conexión asíncrona a PostgreSQL.\nAsegúrate de incluir comentarios explicativos en cada función.',
        category: '💻 Código',
        reactions: { like: 120, love: 15, fire: 60, funny: 0 },
        copy_count: 56,
        tokens_received: 10
    },
    {
        id: 'tp_02',
        title: 'Tutor de Inglés Nativo',
        author: 'maria_dev',
        description: 'Configura a la IA para que actúe como tu tutor personal de inglés británico.',
        prompt_text: 'Actúa como un profesor nativo de inglés de Londres. Tendremos una conversación y me corregirás cada error gramatical o de vocabulario que cometa, explicando la regla gramatical subyacente de forma muy sencilla.',
        category: '🗣️ Idiomas',
        reactions: { like: 200, love: 50, fire: 10, funny: 0 },
        copy_count: 320,
        tokens_received: 50
    },
    {
        id: 'tp_03',
        title: 'Revisor de Contratos Legales',
        author: 'abogado_ia',
        description: 'Revisa cualquier contrato en español buscando cláusulas abusivas.',
        prompt_text: 'Eres un abogado corporativo experto en leyes latinoamericanas. Revisa el siguiente texto legal y lista en viñetas cualquier cláusula ambigua o que pueda representar un riesgo legal para el firmante. Justifica tu respuesta.',
        category: '📄 Documentos',
        reactions: { like: 80, love: 5, fire: 0, funny: 0 },
        copy_count: 12,
        tokens_received: 0
    },
    {
        id: 'tp_04',
        title: 'Copywriter Vendedor Creador',
        author: 'marketing_pro',
        description: 'Crea 5 copies persuasivos para Facebook Ads basados en un producto.',
        prompt_text: 'Crea 5 variaciones de anuncios para Facebook Ads utilizando el modelo AIDA (Atención, Interés, Deseo, Acción) para este producto: [INSERTA PRODUCTO]. Provee al menos 3 ganchos (hooks) diferentes.',
        category: '✍️ Marketing',
        reactions: { like: 300, love: 100, fire: 150, funny: 20 },
        copy_count: 512,
        tokens_received: 420
    }
];

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
                    <button class="btn" style="background: linear-gradient(135deg, #a855f7, #6366f1); border:none;">Compartir Texto</button>
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
                <div style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; white-space: pre-wrap; word-break: break-word;">&gt; ${p.prompt_text}</div>
            </div>
        </div>

        <!-- METADATA FOOTER (Bottom 30%) -->
        <div style="background: linear-gradient(0deg, rgba(8,8,8,1) 0%, rgba(17,17,17,0.8) 100%); padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.05); z-index: 1; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size:0.8rem; opacity:0.8; color: #ccc; cursor:pointer" onclick="event.stopPropagation(); window.location.href='/profile.html?user=${p.author}'">por <span style="color: #fff; font-weight: 600;">@${window.escapeHTML(p.author)}</span></div>
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
<div id="textModalOverlay" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeTextModal()">
    <div class="view-modal-wrapper" style="max-width: 900px;"> <!-- Ligeramente más angosto que imágenes -->
        <div class="view-modal" style="flex-direction: column;"> <!-- Para texto es mejor Vertical -->
            <button class="modal-close-x" onclick="window.closeTextModal()">✕</button>
            
            <div class="view-info-side" style="width: 100%; border-left: none; padding: 40px;">
                <div class="view-scroll-content">
                    <div id="txtMetaTop" style="font-size:0.65rem; color:#a855f7; font-weight:800; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); display:inline-block; padding: 4px 10px; border-radius: 12px;">CATEGORÍA</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px">
                        <h2 id="txtTitle" style="margin:0; flex:1; font-size: 2rem;">Título del Prompt</h2>
                    </div>
                    
                    <div id="txtUser" style="font-weight:700; margin-bottom:20px; color:#cbd5e1; cursor:pointer">por @autor</div>
                    
                    <p id="txtDesc" style="color: #94a3b8; line-height: 1.6; margin-bottom: 25px; font-size: 1.05rem;"></p>
                    
                    <div style="position:relative">
                        <div style="display:flex; justify-content:space-between; align-items:center; background: #000; padding: 10px 15px; border-top-left-radius: 8px; border-top-right-radius: 8px; border: 1px solid #333; border-bottom: none;">
                            <span style="color:#666; font-family:monospace; font-size:0.8rem;">Prompt Estructurado</span>
                            <span id="txtCopyCountBadge" style="color:var(--accent); font-weight:700; font-size: 0.8rem;">📋 Copiado 0 veces</span>
                        </div>
                        <div id="txtPrompt" class="prompt-area" style="background:#0a0a0a; font-family: monospace; white-space: pre-wrap; font-size:0.95rem; line-height: 1.6; color: #a855f7; border-top-left-radius: 0; border-top-right-radius: 0; min-height: 200px; border-color: #333;"></div>
                        
                        <div style="margin-top:20px">
                            <button class="btn" onclick="window.doCopyTextPrompt()" style="width:100%; background: linear-gradient(135deg, #a855f7, #6366f1); border:none; padding:15px; font-size:1.1rem; font-weight:bold;">📋 COPIAR PROMPT AL PORTAPAPELES</button>
                        </div>
                    </div>
                    
                    <div class="reactions-flex" style="margin-top: 30px;">
                        <button class="react-btn">👍 <small id="txt-like-count">0</small></button>
                        <button class="react-btn">❤️ <small id="txt-love-count">0</small></button>
                        <button class="react-btn">🔥 <small id="txt-fire-count">0</small></button>
                    </div>
                    
                    <div style="margin-top:30px; border-top:1px solid #222; padding-top:20px">
                         <h3 style="font-size:1.1rem; margin-bottom:15px">Comentarios</h3>
                         <div style="color:#666; padding: 20px; text-align:center; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed #333;">Aún no hay comentarios (Mockup en prototipo)</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`;

// ---- LOGIC EVENT HANDLERS ----
let activeTextPromptId = null;

// Attach globally
window.openTextDetail = (id) => {
    const promptData = mockTextPrompts.find(p => p.id === id);
    if (!promptData) return;
    activeTextPromptId = id;

    // Fill data
    document.getElementById('txtMetaTop').innerText = promptData.category;
    document.getElementById('txtTitle').innerText = promptData.title;
    document.getElementById('txtUser').innerHTML = `por <span style="color:var(--accent);">@${window.escapeHTML(promptData.author)}</span>`;
    document.getElementById('txtDesc').innerText = promptData.description;
    document.getElementById('txtPrompt').innerText = promptData.prompt_text;
    document.getElementById('txtCopyCountBadge').innerText = `📋 Copiado ${promptData.copy_count} veces`;

    // Fill stats safely
    document.getElementById('txt-like-count').innerText = promptData.reactions.like || 0;
    document.getElementById('txt-love-count').innerText = promptData.reactions.love || 0;
    document.getElementById('txt-fire-count').innerText = promptData.reactions.fire || 0;

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
    const promptData = mockTextPrompts.find(p => p.id === activeTextPromptId);
    if (!promptData) return;

    try {
        await navigator.clipboard.writeText(promptData.prompt_text);

        // Mock DB Update
        promptData.copy_count++;
        document.getElementById('txtCopyCountBadge').innerText = `📋 Copiado ${promptData.copy_count} veces`;

        // Fake Toast Alert (using native or store's)
        if (window.toast) {
            window.toast("¡Prompt Copiado Exitosamente!", "success");
        } else {
            alert("✅ ¡Prompt copiado al portapapeles!");
        }

        // Re-render gallery grid purely (lazy approach for prototype)
        initPage();

    } catch (e) {
        console.error("Error copiando txt", e);
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
            ${renderGallery()}
            
            <div id="text-modals-mount">
                ${TextDetailModalTemplate()}
            </div>
        `;

        console.log("Rendered HTML successfully.");

        // If the modal was open (from re-render copy), pop it back up immediately
        if (activeTextPromptId) {
            window.openTextDetail(activeTextPromptId);
        }

    } catch (err) {
        console.error("❌ CRITICAL ERROR en init page text prompts:", err);
    }
}

// Start immediately, no DOMContentLoaded wait needed for deferred modules
initPage();
