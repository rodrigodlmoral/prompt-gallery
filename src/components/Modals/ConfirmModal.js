import { askConfirm, handleConfirmResolve } from '../../utils/ui-helpers.js';

export const ConfirmModal = () => `
        <div id="confirmModal" class="modal-overlay" style="display:none; z-index:2147483647;"><div class="modal-container" style="max-width:400px; text-align:center">
            <div id="confirmIcon" style="font-size:3rem; margin-bottom:15px">❓</div>
            <div id="confirmText" style="font-size:1.1rem; margin-bottom:25px; line-height:1.5">¿Estás seguro?</div>
            <div style="display:flex; gap:15px; justify-content:center">
                <button class="btn btn-outline" style="flex:1" onclick="window.confirmResolve(false)">Cancelar</button>
                <button class="btn" style="flex:1" onclick="window.confirmResolve(true)">Aceptar</button>
            </div>
        </div></div>`;

// Expose functions to window for the onclick events in the HTML above
window.askConfirm = askConfirm;
window.confirmResolve = handleConfirmResolve;
