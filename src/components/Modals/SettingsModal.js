import { store } from '../../store-final.js';
import { isImageFile } from '../../utils/dom.js';
import { toast } from '../../utils/ui-helpers.js';

export const SettingsModal = () => {
    if (!store.currentUser) return '';
    const u = store.currentUser;
    const soc = u.socials || {};
    const mod = u.moderation || { suggestive: 'BLUR', nsfw: 'BLUR' };

    return `
    <div id="settingsModal" class="modal-overlay" style="display:none;">
        <div class="modal-container" style="max-width:600px">
            <h2>Configuración de Perfil</h2>

            <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
                <h3>👤 Cuenta</h3>
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:15px">
                    <div class="user-avatar-lg" id="previewAvatar" style="width:80px; height:80px; background-image:url('${u.avatar || 'https://robohash.org/' + u.username}')"></div>
                    <div>
                        ${(u.level && u.level >= 2) ? `
                    <button class="btn-outline" onclick="document.getElementById('setAvatarFile').click()">Cambiar Foto</button>
                    ` : `
                    <span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:6px 12px; border-radius:4px; font-size:0.8rem; font-weight:700; border:1px solid rgba(255,165,0,0.3); cursor:not-allowed" title="Necesitas ser Nivel 2 (Principiante) para cambiar tu foto">🔒 Nivel 2 Requerido</span>
                    `}
                        <input type="file" id="setAvatarFile" accept="image/*" style="display:none" onchange="window.previewAvatar(this)">
                    </div>
                </div>

                <label class="form-label">Nombre de Usuario</label>
                <input type="text" id="setUser" class="form-input" value="${u.username}">

                    <div style="margin-top:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px">
                        <button class="btn-outline" onclick="document.getElementById('passSec').style.display = document.getElementById('passSec').style.display === 'none' ? 'block' : 'none'" style="width:100%; text-align:left; display:flex; justify-content:space-between; align-items:center">
                            <span>🔒 Cambiar Contraseña</span>
                            <span>▼</span>
                        </button>
                        <div id="passSec" style="display:none; margin-top:10px">
                            <label class="form-label">Nueva Contraseña</label>
                            <div style="position:relative">
                                <input type="password" id="newPassInput" class="form-input" placeholder="Mínimo 6 caracteres" style="padding-right:40px">
                                    <span onclick="window.togglePass('newPassInput', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                            </div>
                            <button class="btn" onclick="window.doChangePassword()" style="margin-top:10px; width:100%; background:#d32f2f">Actualizar Contraseña</button>
                        </div>
                    </div>
            </div>

            <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333; position:relative">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                    <h3 style="margin:0">🌐 Redes Sociales</h3>
                    ${(u.level && u.level >= 2) ? '' : `<span style="background:rgba(255,165,0,0.1); color:#ffa500; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:700; border:1px solid rgba(255,165,0,0.3)">🔒 Nivel 2 Requerido</span>`}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; ${(u.level && u.level >= 2) ? '' : 'opacity:0.3; pointer-events:none; filter:grayscale(1)'}">
                    <div>
                        <label class="form-label">Instagram</label>
                        <input type="text" id="setIg" class="form-input" placeholder="@usuario" value="${soc.ig || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                    <div>
                        <label class="form-label">Facebook</label>
                        <input type="text" id="setFb" class="form-input" placeholder="URL o usuario" value="${soc.fb || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                    <div>
                        <label class="form-label">X / Twitter</label>
                        <input type="text" id="setX" class="form-input" placeholder="@usuario" value="${soc.x || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                    <div>
                        <label class="form-label">Telegram Channel</label>
                        <input type="text" id="setTg" class="form-input" placeholder="t.me/canal" value="${soc.tg || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                    <div>
                        <label class="form-label">Threads</label>
                        <input type="text" id="setTh" class="form-input" placeholder="@usuario" value="${soc.th || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                    <div>
                        <label class="form-label">Fanvue</label>
                        <input type="text" id="setFv" class="form-input" placeholder="URL Completa" value="${soc.fv || ''}" ${(u.level && u.level >= 2) ? '' : 'disabled'}>
                    </div>
                </div>
            </div>

            <div class="settings-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #333">
                <h3>🛡️ Moderación de Contenido</h3>

                <div style="margin-bottom:15px">
                    <label class="form-label">Contenido Sugestivo</label>
                    <select id="setModSugg" class="form-input">
                        <option value="ON" ${mod.suggestive === 'ON' ? 'selected' : ''}>Mostrar</option>
                        <option value="BLUR" ${mod.suggestive === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                    </select>
                </div>

                <div>
                    <label class="form-label">Contenido NSFW / +18</label>
                    <select id="setModNsfw" class="form-input">
                        <option value="ON" ${mod.nsfw === 'ON' ? 'selected' : ''}>Mostrar</option>
                        <option value="BLUR" ${mod.nsfw === 'BLUR' ? 'selected' : ''}>Difuminar (Blur)</option>
                        <option value="OFF" ${mod.nsfw === 'OFF' ? 'selected' : ''}>Apagar (No mostrar)</option>
                    </select>
                </div>
            </div>

            <div class="settings-section" style="margin-bottom:20px; background:#331111; padding:15px; border-radius:8px; border:1px solid #ff4444">
                <h3 style="color:#ff4444; margin-top:0">⚠️ Zona de Peligro</h3>
                <p style="font-size:0.9rem; color:#faa">Esta acción es irreversible. Se borrarán todos tus posts y datos.</p>
                <button class="btn-outline" onclick="window.doDeleteAccount()" style="border-color:#ff4444; color:#ff4444; width:100%">ELIMINAR MI CUENTA</button>
            </div>

            <div style="display:flex; gap:10px">
                <button class="btn" onclick="window.saveSettings()" style="flex:1">Guardar Cambios</button>
                <button class="btn-outline" onclick="window.closeModals()" style="flex:1">Cancelar</button>
            </div>
        </div>
    </div> `;
};

// --- LOGIC ---

window.openSettings = () => {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        // FIX: Move to body to avoid stacking context/overflow issues
        if (modal.parentNode !== document.body) {
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        modal.style.zIndex = '9999999'; // Force super top
        console.log("Settings Modal Opened (Moved to Body + Forced Top)");
    } else {
        console.error("Settings Modal NOT FOUND");
    }
};

window.previewAvatar = (input) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!isImageFile(file)) {
            alert("❌ Por favor selecciona una imagen válida para tu avatar.");
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewAvatar').style.backgroundImage = `url('${e.target.result}')`;
        }
        reader.readAsDataURL(file);
    }
};

window.saveSettings = () => {
    const username = document.getElementById('setUser').value;

    // Avatar upload
    const avatarFile = document.getElementById('setAvatarFile').files[0];

    const finishSave = (avatarData) => {
        const canEditSocials = store.currentUser && store.currentUser.level >= 2;

        const socials = canEditSocials ? {
            ig: document.getElementById('setIg').value,
            fb: document.getElementById('setFb').value,
            x: document.getElementById('setX').value,
            tg: document.getElementById('setTg').value,
            th: document.getElementById('setTh').value,
            fv: document.getElementById('setFv').value
        } : (store.currentUser.socials || {});

        const moderation = {
            suggestive: document.getElementById('setModSugg').value,
            nsfw: document.getElementById('setModNsfw').value
        };

        const updateData = {
            username,
            socials,
            moderation
        };

        if (avatarData) updateData.avatar = avatarData;

        store.updateUserSettings(updateData);

        // Keep modal open or close? Usually close on success. Store will alert success.
        window.closeModals();
    };

    if (!username) return alert("El nombre de usuario es requerido");

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = () => finishSave(reader.result);
        reader.readAsDataURL(avatarFile);
    } else {
        finishSave(null);
    }
};

window.doChangePassword = () => {
    const newPass = document.getElementById('newPassInput').value;
    if (!newPass || newPass.length < 6) {
        return alert("La contraseña debe tener al menos 6 caracteres.");
    }
    if (confirm("¿Seguro que quieres cambiar tu contraseña?")) {
        store.changePassword(newPass);
    }
};

window.doDeleteAccount = () => {
    const confirmation = prompt("⚠️ PELIGRO ⚠️\nEscribe 'ELIMINAR' para borrar tu cuenta permanentemente.\nEsta acción NO se puede deshacer.");
    if (confirmation === 'ELIMINAR') {
        store.deleteAccount();
        alert("Tu cuenta ha sido eliminada.");
        window.location.reload();
    }
};
