export const DetailModalTemplate = () => `
<div id="viewModal" class="modal-overlay" style="display:none;" onclick="if(event.target === this) window.closeModals()">
    <div class="view-modal-wrapper">
        <div class="view-modal">
            <button class="modal-close-x" onclick="window.closeModals()">✕</button>
            <div class="view-img-side" id="detImgWrap">
                <div id="detCopyBadge" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:4px 10px; border-radius:15px; font-size:0.7rem; color:var(--accent); font-weight:700; border:1px solid var(--accent); display:none; z-index:10">📋 Copiado 0 veces</div>
                <img id="detImg" src="" alt="Post Image">
                <button class="fullscreen-btn" onclick="window.doFullScreen()">🔍 Ver Pantalla Completa</button>
                
                <div class="seq-nav-btn prev" id="detPrevBtn" onclick="window.prevSeqStep()" style="display:none">❮</div>
                <div class="seq-nav-btn next" id="detNextBtn" onclick="window.nextSeqStep()" style="display:none">❯</div>
                <div class="seq-counter" id="detSeqCount" style="display:none"></div>
            </div>
            
            <div class="view-info-side">
                <div class="view-scroll-content">
                    <div id="detMetaTop" style="font-size:0.65rem; color:#666; font-weight:700; margin-bottom:5px; text-transform:uppercase"></div>
                    <div id="detExtra" style="margin-bottom:10px; font-size:0.85rem"></div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px">
                        <h2 id="detTitle" style="margin:0; flex:1"></h2>
                        <div class="dropdown" style="position:relative">
                            <button class="btn-icon" onclick="window.toggleOptionsMenu()" style="font-size:1.5rem">⋮</button>
                            <div id="optionsMenu" class="dropdown-menu" style="right:0; left:auto; display:none">
                                <div class="dropdown-item" onclick="window.doSavePrompt()">💾 Guardar</div>
                                <div class="dropdown-item" onclick="window.doCopyPrompt('main')">📋 Copiar Prompt</div>
                                <div class="dropdown-item" id="optReport" onclick="window.doReportPrompt()">⚠️ Reportar</div>
                                <div class="dropdown-item" id="optHide" onclick="window.doHidePrompt()">🚫 Ocultar Post</div>
                                <div class="dropdown-item" id="optBlock" onclick="window.doBlockUser()">👤 Bloquear Usuario</div>
                                <div class="dropdown-item" id="optAdminFeature" style="display:none; color:gold" onclick="window.doAdminFeaturePrompt()">⭐ Destacar (Admin)</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="detUser" style="font-weight:700; margin-bottom:10px; color:var(--accent); cursor:pointer"></div>
                    <div id="detOrigCreator" style="display:none; align-items:center; gap:5px; font-size:0.85rem; color:#888; margin-bottom:15px">
                        <span>🎨 Creador Original:</span>
                        <a id="detOrigLink" href="#" target="_blank" style="color:var(--accent); text-decoration:none; font-weight:600"></a>
                    </div>
    
                    <div id="detBadges" style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap"></div>
                    <div id="detTags" class="server-tags-display"></div>
                    
                    <div style="position:relative">
                        <div id="detPrompt" class="prompt-area"></div>
                        <div id="detNegPrompt" class="prompt-area" style="display:none; margin-top:10px; border-color:#ff4444; background:rgba(255,0,0,0.05); color:#ff6666"></div>
                        <div id="copyButtonsWrap" style="display:flex; flex-direction:column; gap:8px; margin-top:10px">
                            <button class="btn-outline" onclick="window.doCopyPrompt('main')" style="width:100%">📋 Copiar Prompt</button>
                            <button id="btnCopyNeg" class="btn-outline" onclick="window.doCopyPrompt('negative')" style="width:100%; display:none; border-color:rgba(255,68,68,0.4); color:#ff6666">❌ Copiar Neg. Prompt</button>
                        </div>
                    </div>
                    
                    <div class="reactions-flex">
                        <button class="react-btn" id="btn-react-like" onclick="window.doReact('like')">👍 <small id="det-like-count">0</small></button>
                        <button class="react-btn" id="btn-react-love" onclick="window.doReact('love')">❤️ <small id="det-love-count">0</small></button>
                        <button class="react-btn" id="btn-react-fire" onclick="window.doReact('fire')">🔥 <small id="det-fire-count">0</small></button>
                        <button class="react-btn" id="btn-react-funny" onclick="window.doReact('funny')">😂 <small id="det-funny-count">0</small></button>
                        <button class="react-btn" id="btn-react-dislike" onclick="window.doReact('dislike')">👎 <small id="det-dislike-count">0</small></button>
                        <button class="react-btn" id="btn-react-sad" onclick="window.doReact('sad')">😢 <small id="det-sad-count">0</small></button>
                    </div>
                    
                    <div style="margin-top:20px; border-top:1px solid #222; padding-top:15px">
                         <h3 style="font-size:1rem; margin-bottom:10px">Comentarios</h3>
                         <div id="detComments"></div>
                    </div>
                </div>
                
                <div class="view-footer">
                    <div id="commAntiBot" class="comment-anti-bot-container" style="display:none">
                        <div class="crystal-slider-wrapper" id="commSlider">
                            <div class="crystal-slider-track-text">Desliza 💎 para confirmar</div>
                            <div class="crystal-slider-handle" id="commSliderHandle">💎</div>
                        </div>
                        <input type="text" name="b_name" class="hp-field" id="commHoneypot" tabindex="-1" autocomplete="off">
                    </div>

                    <div style="display:flex; gap:10px; margin-top:10px">
                        <input type="text" id="commInput" class="form-input" placeholder="Escribe un comentario..." onfocus="window.showSlider()">
                        <button class="btn" id="commSubmitBtn" onclick="window.postComm()">Enviar</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="ad-bottom"></div>
    </div>
</div>`;
