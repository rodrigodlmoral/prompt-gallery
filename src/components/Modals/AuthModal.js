import { store } from '../../store-final.js';
import { toast } from '../../utils/ui-helpers.js';

const ALLOWED_DOMAINS = [
    // Globales
    'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'apple.com',
    'protonmail.com', 'proton.me', 'tutanota.com', 'tuta.io',
    // Regionales / Otros
    'aol.com', 'zoho.com', 'yandex.com', 'mail.com', 'gmx.com',
    'rocketmail.com', 'fastmail.com', 'hushmail.com', 'prompt-gallery.app'
];

export const AuthModal = () => `
        <div id="authModal" class="modal-overlay" style="display:none;"> <div class="modal-container">
            <div id="loginForm">
                <h2>Entrar</h2>
                <input type="text" id="logUser" class="form-input" placeholder="Usuario o Email">
                    <div style="position:relative">
                        <input type="password" id="logPass" class="form-input" placeholder="Pass" style="padding-right:40px">
                            <span onclick="window.togglePass('logPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                    </div>
                    <button class="btn" style="width:100%" onclick="window.doLoginSubmit()">Login</button>
                    <p style="margin-top:10px; font-size:0.9em">
                        <a href="#" onclick="window.toggleAuth('rec')" style="color:#666">¿Olvidaste tu contraseña?</a>
                    </p>
                    <p>¿No tienes cuenta? <a href="#" onclick="window.toggleAuth('reg')">Regístrate</a></p>
            </div>
            <div id="regForm" style="display:none;">
                <h2 style="margin-bottom: 20px;">Registro</h2>
                
                <div class="community-rules" style="margin-bottom: 25px; text-align: left;">
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem; line-height: 1.5; color: #ccc;">
                        <div style="margin-bottom: 8px;">🔞 <strong>Edad:</strong> Debes ser mayor de 18 años para usar esta plataforma.</div>
                        <div style="margin-bottom: 8px;">🤝 <strong>Consentimiento:</strong> El contenido real de terceros requiere permiso explícito.</div>
                        <div style="margin-bottom: 0;">🛡️ <strong>Responsabilidad:</strong> Eres responsable de todo el contenido que publiques.</div>
                    </div>
                    <p style="font-size: 0.8rem; color: #888; margin-top: 15px; margin-bottom: 15px; text-align: center; opacity: 0.8;">Al continuar, aceptas nuestros términos y condiciones</p>
                </div>
                <input type="text" id="regEmail" class="form-input" placeholder="Email">
                    <input type="text" id="regUser" class="form-input" placeholder="Usuario">
                        <div style="position:relative">
                            <input type="password" id="regPass" class="form-input" placeholder="Contraseña" style="padding-right:40px">
                                <span onclick="window.togglePass('regPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                        </div>
                        <button class="btn" style="width:100%" onclick="window.doRegisterSubmit()">Registrar</button>
                        <p>¿Ya tienes cuenta? <a href="#" onclick="window.toggleAuth('log')">Login</a></p>
                    </div>
                    <div id="recoverForm" style="display:none;">
                        <h2>Recuperar Pass</h2>
                        <p style="margin-bottom:15px; color:#888; font-size:0.85rem">Introduce tu email de registro:</p>
                        <input type="email" id="recEmail" class="form-input" placeholder="ejemplo@correo.com" style="margin-bottom:15px">
                            <button class="btn" style="width:100%" onclick="window.doRecoverSubmit()">Enviar Instrucciones</button>
                            <p style="margin-top:15px; font-size:0.9rem">
                                <a href="#" onclick="window.toggleAuth('log')" style="color:#666">Volver al Login</a>
                            </p>
                    </div>
                    <div id="activateForm" style="display:none;">
                        <h2 id="actTitle">Activar Cuenta</h2>
                        <p id="actDesc" style="margin-bottom:15px; color:#a29bfe; font-size:0.85rem; font-weight:700">¡Bienvenido! Elige tu nueva contraseña para activar tu perfil.</p>
                        <input type="text" id="actUser" class="form-input" placeholder="Usuario o Email">
                            <div style="position:relative">
                                <input type="password" id="actPass" class="form-input" placeholder="Nueva Contraseña" style="padding-right:40px">
                                    <span onclick="window.togglePass('actPass', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:1.2rem; user-select:none">👁️</span>
                            </div>
                            <button class="btn" style="width:100%" onclick="window.doActivateSubmit()">Activar y Entrar</button>
                    </div>
                    <button class="btn-outline" style="width:100%; border:none; margin-top:10px" onclick="window.closeModals()">Cancelar</button>
            </div></div>`;

// --- LOGIC ATTACHMENT ---

window.toggleAuth = (m) => {
    document.getElementById('loginForm').style.display = m === 'log' ? 'block' : 'none';
    document.getElementById('regForm').style.display = m === 'reg' ? 'block' : 'none';
    const recForm = document.getElementById('recoverForm');
    if (recForm) recForm.style.display = m === 'rec' ? 'block' : 'none';
    const actForm = document.getElementById('activateForm');
    if (actForm) actForm.style.display = m === 'act' ? 'block' : 'none';
};

window.doLoginSubmit = async () => {
    const res = await store.login(document.getElementById('logUser').value, document.getElementById('logPass').value);
    if (!res.success) alert(res.msg);
};

window.doRegisterSubmit = async () => {
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const domain = email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
        toast("Por seguridad no puedes registrarte con ese correo, prueba con otro.", "error");
        return;
    }

    const res = await store.register(email, document.getElementById('regUser').value, document.getElementById('regPass').value);
    if (!res.success) {
        alert(res.msg);
    } else {
        // ÉXITO: Limpiar formulario y avisar
        document.getElementById('regEmail').value = '';
        document.getElementById('regUser').value = '';
        document.getElementById('regPass').value = '';

        toast("🎉 ¡Cuenta creada! Por seguridad, hemos enviado un link de activación a tu correo. Revísalo (incluso en spam) para poder entrar.", "success");

        window.toggleAuth('log'); // Mandar a login tras registro
    }
};

window.doRecoverSubmit = async () => {
    const email = document.getElementById('recEmail').value;
    if (!email) { toast("Por favor introduce tu email.", "warning"); return; }
    const res = await store.recoverPassword(email);
    if (res.success) {
        toast(res.msg, "success");
        document.getElementById('recEmail').value = '';
        window.toggleAuth('log');
    } else {
        toast(res.msg, "error");
    }
};

window.doActivateSubmit = async () => {
    const userOrEmail = document.getElementById('actUser').value;
    const pass = document.getElementById('actPass').value;

    // Buscar token en el buscador o en el hash (o en la variable global del módulo main/window)
    const token = window._authToken || new URLSearchParams(window.location.search).get('token') || (window.location.hash.split('/').pop());

    if (!userOrEmail || !pass) { toast("Rellena todos los campos.", "warning"); return; }
    if (!token || token.length < 10) return alert("Token de activación no encontrado o inválido.");

    toast("Procesando solicitud...", "info");

    // CRITICAL FIX: Determinar si es password-reset o account-activation
    const isPasswordReset = window._authType === 'password-reset';

    let res;
    if (isPasswordReset) {
        // PASSWORD RESET: Usar el método específico para reset de contraseña
        res = await store.confirmPasswordReset(token, pass, userOrEmail);
    } else {
        // ACCOUNT ACTIVATION: Usar el método de activación original
        res = await store.confirmResetPassword(token, pass, userOrEmail);
    }

    if (res.success) {
        const msg = isPasswordReset
            ? "¡Contraseña actualizada con éxito! Ya puedes entrar."
            : "¡Cuenta activada con éxito! Bienvenido.";
        alert(msg);
        window.location.hash = '';
        window.location.search = '';
        window.location.reload(); // Recargar para limpiar estado
    } else {
        alert(res.msg);
    }
};

window.openLogin = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('log');
};

window.openRegister = () => {
    document.getElementById('authModal').style.display = 'flex';
    window.toggleAuth('reg');
};

window.doLogout = () => {
    store.logout();
};
