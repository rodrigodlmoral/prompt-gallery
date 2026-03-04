import { pb } from '../pocketbase.js';
import { store } from '../store-final.js';
import { escapeHTML } from '../utils/security.js';

let activeTextPromptId = null;

export const TextDetailModalTemplate = () => `
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
                <!-- LEFT: Main prompt content -->
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

export const initTextModalLogic = () => {
    window.openTextDetail = async (id) => {
        let promptData;
        if (window.textPrompts) promptData = window.textPrompts.find(p => p.id === id);
        if (!promptData && window.profileTextPrompts) promptData = window.profileTextPrompts.find(p => p.id === id);

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
        document.getElementById('txtUser').innerHTML = `por <span style="color:var(--accent);">@${escapeHTML(authorUsername)}</span>`;

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
                            <span style="font-weight:700; color:var(--accent); font-size:0.85rem">@${escapeHTML(c.user || c.username)}</span>
                            ${(isPostOwner || currUser === c.user || currUser === c.username) ? `<button onclick="window.doDeleteTextComment('${c.id || c.date}')" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.8rem; padding:0">🗑️</button>` : ''}
                        </div>
                        <div style="font-size:0.9rem; color:#eee; word-break:break-word">${escapeHTML(c.text)}</div>
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

        // Find prompt again
        let promptData;
        if (window.textPrompts) promptData = window.textPrompts.find(p => p.id === activeTextPromptId);
        if (!promptData && window.profileTextPrompts) promptData = window.profileTextPrompts.find(p => p.id === activeTextPromptId);
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

            window.openTextDetail(activeTextPromptId);
        } else {
            if (window.toast) window.toast(result.msg || "Error al comentar", "error");
        }
    };

    window.doDeleteTextComment = async (commentId) => {
        if (!store.currentUser) return;
        if (confirm("¿Seguro que quieres eliminar este comentario?")) {
            const res = await store.removeTextComment(activeTextPromptId, commentId);
            if (res.success) {
                window.openTextDetail(activeTextPromptId);
            }
        }
    };
};
