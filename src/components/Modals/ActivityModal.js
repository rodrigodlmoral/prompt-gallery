export const ActivityModal = () => `
    <div id="activityModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
        <div class="modal-container" style="max-width:700px; height:80vh; display:flex; flex-direction:column">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
                <h2 style="margin:0">📦 Actividad Reciente</h2>
                <button class="modal-close-x" onclick="window.closeModals()" style="position:static">✕</button>
            </div>
            
            <div id="activityList" style="flex:1; overflow-y:auto; padding-right:10px" class="custom-scrollbar">
                <div class="loader-container">
                    <div class="loader"></div>
                </div>
            </div>
        </div>
    </div>`;
