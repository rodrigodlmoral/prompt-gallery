import { store } from '../../store-final.js';
import { toast, askConfirm } from '../../utils/ui-helpers.js';

export const TipModal = () => `
    <div id = "tipModal" class="modal-overlay" style = "display:none; z-index:9999999 !important;"> <div class="modal-container" style="max-width:400px; text-align:center; position:relative; z-index:9999999">
        <div style="font-size:3rem; margin-bottom:10px">💎</div>
        <h2 id="tipTitle">Enviar Propina</h2>
        <p id="tipSubtitle" style="color:#888; margin-bottom:20px"></p>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px">
            <button class="btn-outline" onclick="window.doSendTip(5)">💎 5 PromptBits</button>
            <button class="btn-outline" onclick="window.doSendTip(10)">💎 10 PromptBits</button>
            <button class="btn-outline" onclick="window.doSendTip(20)">💎 20 PromptBits</button>
            <button class="btn-outline" onclick="window.doSendTip(50)">💎 50 PromptBits</button>
        </div>

        <div style="font-size:0.8rem; color:#666; margin-bottom:20px">
            Tu saldo: <span id="tipMyTokens" style="color:#a29bfe; font-weight:700">0</span> PromptBits
        </div>

        <button class="btn-outline" style="width:100%; border:none; color:#666" onclick="window.closeModals()">Cancelar</button>
    </div></div> `;

// --- LOGIC ---
let currentTipPostId = null;

window.openTip = (postId) => {
    if (!store.currentUser) {
        alert("Debes iniciar sesión para enviar propinas.");
        // Assuming window.openLogin is available globally (from AuthModal)
        if (window.openLogin) window.openLogin();
        return;
    }
    const p = store.prompts.find(x => String(x.id) === String(postId));
    if (!p) {
        toast("❌ Post no encontrado", 'error');
        return;
    }

    currentTipPostId = postId;

    // Remove any existing dynamic tip modal
    const existingModal = document.getElementById('dynamicTipModal');
    if (existingModal) existingModal.remove();

    // Create modal dynamically (Legacy support or just use the static one above? The code in main.js had a dynamic creator inside openTip too?
    // Let's check main.js again.
    // In main.js, openTip CREATES a dynamic modal 'dynamicTipModal' AND there is a static 'TipModal' template defined but maybe unused or used differently?
    // Line 602 in main.js invokes ${TipModal()} in the HTML render.
    // But lines 1264-1287 in main.js create a NEW div 'dynamicTipModal'.
    // It seems there are TWO ways or the static one is ignored/vestigial?
    // The static one has id="tipModal". The dynamic one has id="dynamicTipModal".
    // The dynamic one is created in openTip.
    // The static one is rendered in main.js.
    // If I look at openTip implementation in main.js (lines 1245+), it creates 'dynamicTipModal'.
    // So the static TipModal might be unused code? Or fall back?
    // Let's keep the dynamic logic as it seems to be the active one.
    // However, the static template also calls window.doSendTip.
    // I will preserve both behaviors to be safe, but mostly the dynamic one seems active.

    // Actually, looking at main.js line 1259:
    // const existingModal = document.getElementById('dynamicTipModal');
    // if (existingModal) existingModal.remove();
    // Then it creates new overlay.
    // It does NOT show the #tipModal which is in the DOM.
    // So the #tipModal in DOM (lines 534-552) seems unused?
    // Or maybe older code used it.
    // I will include the logic to create the dynamic modal inside openTip as per main.js.

    const overlay = document.createElement('div');
    overlay.id = 'dynamicTipModal';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9000000; display:flex; align-items:center; justify-content:center;';

    overlay.innerHTML = `
                <div style="background:#1a1a2e; border:1px solid #333; border-radius:16px; padding:30px; max-width:400px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <div style="font-size:3rem; margin-bottom:10px">💎</div>
                    <h2 style="color:#fff; margin:0 0 5px 0">Enviar a @${p.author}</h2>
                    <p style="color:#888; margin-bottom:20px">Apoya el post "${p.title}"</p>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px">
                        <button onclick="window.doSendTip(5)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 5</button>
                        <button onclick="window.doSendTip(10)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 10</button>
                        <button onclick="window.doSendTip(20)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 20</button>
                        <button onclick="window.doSendTip(50)" style="background:transparent; border:1px solid #a29bfe; color:#a29bfe; padding:12px; border-radius:8px; cursor:pointer; font-size:1rem; font-weight:600">💎 50</button>
                    </div>

                    <div style="font-size:0.85rem; color:#666; margin-bottom:20px">
                        Tu saldo: <span style="color:#a29bfe; font-weight:700">${store.currentUser.tokens || 0}</span> PromptBits
                    </div>

                    <button onclick="document.getElementById('dynamicTipModal').remove()" style="background:transparent; border:none; color:#666; padding:10px 20px; cursor:pointer; font-size:0.9rem">Cancelar</button>
                </div>
                `;

    // Click on overlay (outside modal) to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Add to body
    document.body.appendChild(overlay);
};

window.doSendTip = async (amount) => {
    if (!currentTipPostId) return;
    // askConfirm returns true/false
    if (await askConfirm(`¿Enviar ${amount} PromptBits a este autor ? `, '💎')) {
        // Immediate feedback
        toast("Enviando PromptBits...", "info");

        const res = await store.sendTip(currentTipPostId, amount);
        if (res.success) {
            toast(res.msg, 'success');
            window.closeModals();
            if (window.render) window.render();
        } else {
            toast("❌ " + res.msg, 'error');
        }
    }
};
