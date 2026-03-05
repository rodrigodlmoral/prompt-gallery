import { store, TOOLS, RATINGS, INFO_ICON } from '../../store-final.js';
import { isImageFile, previewFile } from '../../utils/dom.js';
import { toast } from '../../utils/ui-helpers.js';

let seqStepCount = 0;
let isEditing = false;
let editingId = null;

export const CreateModal = () => `
                <div id="createModal" class="modal-overlay" style="display:none;"><div class="modal-container">
    <h2>Compartir Prompt</h2>
    
    <div class="form-group">
        <label class="form-label">Tipo de Prompt</label>
        <div style="display:flex; gap:15px; margin-bottom:20px">
            <label class="chk-wrap">
                <input type="radio" name="postType" value="single" checked onchange="window.togglePostType('single')">
                <span>Sencillo (1 imagen)</span>
            </label>
            <label class="chk-wrap">
                <input type="radio" name="postType" value="sequence" onchange="window.togglePostType('sequence')">
                <span>Secuencia (Múltiples) <small style="color:var(--accent); font-weight:bold">[Nivel 2+]</small></span>
            </label>
        </div>
    </div>
    
    <!-- FIX: Form wrapper to prevent autofill -->
    <form autocomplete="off" onsubmit="return false;" style="display:contents">
        <input type="text" name="fakeusernameremembered" style="display:none" autocomplete="username">
        <input type="password" name="fakepasswordremembered" style="display:none" autocomplete="current-password">
    
    <input type="text" id="upTitle" class="form-input" placeholder="Título" style="margin-bottom:15px" autocomplete="off" name="post_title_unique_id">
    
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px">
        <label class="form-label" style="font-size:0.75rem; color:#666">HERRAMIENTA</label>
        <select id="upTool" class="form-input" style="margin:0" onchange="window.checkToolConfig()">${TOOLS.map(t => `<option value='${t}'>${t}</option>`).join('')}</select>
    </div>

    <!-- Contenedor para Checkpoint/LoRA/Embedding (Solo para SD/Comfy/Fooocus) -->
    <div id="upExtraConfig" style="display:none; background:#111; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #222">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
            <span style="font-size:0.8rem; font-weight:bold; color:var(--accent)">CONFIGURACIÓN ADICIONAL</span>
            <button class="btn-icon" onclick="window.addExtraRow()" style="background:var(--accent); width:24px; height:24px; font-size:1.2rem; display:flex; align-items:center; justify-content:center">+</button>
        </div>
        <div id="extraRowsContainer"></div>
    </div>
    
    <div id="singleFields">
        <div style="display:flex; align-items:center; margin-bottom:15px">
            <select id="upRating" class="form-input" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
            ${INFO_ICON}
        </div>
        <input type="file" id="upFile" class="form-input" accept="image/*" style="margin-bottom:15px" onchange="window.previewFile(this, 'singlePreview')">
        <div id="singlePreview" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:15px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
            <img src="" style="max-width:100%; max-height:350px; display:block; border-radius:4px">
        </div>
        <label class="form-label" style="font-size:0.75rem; color:#666">PROMPT</label>
        <textarea id="upPrompt" class="form-input" placeholder="Prompt positivo..." rows="4" autocomplete="off" style="margin-bottom:10px"></textarea>
        
        <div style="display:flex; justify-content:center; margin-bottom:10px">
            <button class="btn-outline" onclick="window.toggleNeg('singleNeg')" style="padding:4px 12px; font-size:0.85rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
        </div>
        
        <div id="singleNeg" style="display:none; margin-bottom:15px">
            <label class="form-label" style="font-size:0.75rem; color:#ff4444">NEGATIVE PROMPT</label>
            <textarea id="upNegPrompt" class="form-input" placeholder="Lo que NO quieres en la imagen..." rows="3" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
        </div>
    </div>
    
    <div id="sequenceFields" style="display:none">
        <div id="seqContainer"></div>
        <button class="btn-outline" onclick="window.addSeqStep()" style="width:100%; margin-bottom:15px">+ Añadir Paso</button>
    </div>
    
    <div id="tagSelectorRoot"></div>

    <div style="display:flex; flex-direction:column; gap:5px; margin:15px 0">
        <label class="chk-wrap">
            <input type="checkbox" id="upReference" name="reference_chk_unique">
            <span>📸 Requiere imagen de referencia</span>
        </label>
        <label class="chk-wrap">
            <input type="checkbox" id="upPrivate" name="private_chk_unique">
            <span>🔒 Hacer privado (solo yo puedo verlo)</span>
        </label>
    </div>
    
    </form>
    
    <div style="display:flex; gap:10px">
        <button class="btn" id="pubBtn" onclick="window.doPublish()" style="width:100%; margin-bottom:10px">Publicar</button>
        <button class="btn-outline" onclick="window.closeModals()" style="width:100%">Cerrar</button>
</div></div></div>`;

// --- LOGIC ---

window.togglePostType = (type) => {
    const isSequence = type === 'sequence';
    const effectiveLevel = store.getEffectiveLevel(store.currentUser);

    if (isSequence && effectiveLevel < 2) {
        alert("⚠️ Función Bloqueda: Necesitas ser Nivel 2 o superior (o tener una Badge Especial) para subir secuencias.");
        const singleRadio = document.querySelector('input[name="postType"][value="single"]');
        if (singleRadio) singleRadio.checked = true;
        return;
    }
    document.getElementById('singleFields').style.display = type === 'single' ? 'block' : 'none';
    document.getElementById('sequenceFields').style.display = type === 'sequence' ? 'block' : 'none';
    if (type === 'sequence' && seqStepCount === 0) {
        window.addSeqStep();
    }
};

window.checkToolConfig = () => {
    const tool = document.getElementById('upTool').value;
    const sdTools = ['S.D 1.5', 'S.D 2.0', 'SDXL', 'Fooocus', 'ComfyUI', 'DIGEN AI'];
    const panel = document.getElementById('upExtraConfig');
    if (sdTools.includes(tool)) {
        panel.style.display = 'block';
        // Si no hay filas, añadir una por defecto
        if (document.getElementById('extraRowsContainer').children.length === 0) {
            window.addExtraRow();
        }
    } else {
        panel.style.display = 'none';
    }
};

// Predefined checkpoint options for tools that use them
const CHECKPOINT_OPTIONS = ['Image Motion', 'FLUX.2 [Klein]'];

window.addExtraRow = () => {
    const container = document.getElementById('extraRowsContainer');
    const div = document.createElement('div');
    div.className = 'extra-config-row';
    div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center';
    div.innerHTML = `
    <select class="form-input extra-type" style="margin:0; flex:1" onchange="window._toggleExtraValField(this)">
            <option value="CHECKPOINT">CHECKPOINT</option>
            <option value="LORA">LORA</option>
            <option value="EMBEDDING">EMBEDDING</option>
        </select>
    <select class="form-input extra-val" style="margin:0; flex:2">
            <option value="" disabled selected>Seleccionar checkpoint...</option>
            ${CHECKPOINT_OPTIONS.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <button class="btn-icon" onclick="this.parentElement.remove()" style="background:#444; width:24px; height:24px; flex-shrink:0">×</button>
        `;
    container.appendChild(div);
};

// Swap between dropdown (CHECKPOINT) and text input (LORA/EMBEDDING)
window._toggleExtraValField = (selectEl) => {
    const row = selectEl.closest('.extra-config-row');
    const oldVal = row.querySelector('.extra-val');
    let newEl;
    if (selectEl.value === 'CHECKPOINT') {
        newEl = document.createElement('select');
        newEl.className = 'form-input extra-val';
        newEl.style.cssText = 'margin:0; flex:2';
        newEl.innerHTML = `<option value="" disabled selected>Seleccionar checkpoint...</option>${CHECKPOINT_OPTIONS.map(c => `<option value="${c}">${c}</option>`).join('')}`;
    } else {
        newEl = document.createElement('input');
        newEl.type = 'text';
        newEl.className = 'form-input extra-val';
        newEl.style.cssText = 'margin:0; flex:2';
        newEl.placeholder = 'Nombre/Valor...';
    }
    oldVal.replaceWith(newEl);
};

window.toggleNeg = (id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.addSeqStep = () => {
    seqStepCount++;
    const container = document.getElementById('seqContainer');
    const stepDiv = document.createElement('div');
    stepDiv.className = 'seq-step';
    stepDiv.style.cssText = 'border:1px solid #333; padding:15px; border-radius:8px; margin-bottom:15px';
    const negId = `seqNeg-${seqStepCount}`;
    stepDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
            <strong>Paso ${seqStepCount}</strong>
            <button class="btn-outline" onclick="this.parentElement.parentElement.remove()" style="padding:5px 10px">Eliminar</button>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:10px">
            <select class="form-input seqRating" style="margin:0">${RATINGS.map(r => `<option value='${r}'>${r}</option>`).join('')}</select>
            ${INFO_ICON}
        </div>
        <input type="file" class="form-input seqFile" accept="image/*" style="margin-bottom:10px" onchange="window.previewFile(this, 'seqPreview-${seqStepCount}')">
            <div id="seqPreview-${seqStepCount}" style="width:100%; display:none; background:#000; border-radius:8px; margin-bottom:10px; border:1px solid #333; align-items:center; justify-content:center; padding:10px; overflow:hidden">
                <img src="" style="max-width:100%; max-height:300px; display:block; border-radius:4px">
            </div>

            <label class="form-label" style="font-size:0.7rem; color:#666">PROMPT</label>
            <textarea class="form-input seqPrompt" placeholder="Prompt para este paso" rows="3" style="margin-bottom:10px"></textarea>

            <div style="display:flex; justify-content:center; margin-bottom:10px">
                <button class="btn-outline" onclick="window.toggleNeg('${negId}')" style="padding:3px 10px; font-size:0.75rem; border-color:#ff4444; color:#ff4444; border-radius:20px; font-weight:700">+Añadir Negative Prompt</button>
            </div>

            <div id="${negId}" style="display:none; margin-bottom:10px">
                <label class="form-label" style="font-size:0.7rem; color:#ff4444">NEGATIVE PROMPT</label>
                <textarea class="form-input seqNegPrompt" placeholder="Negative prompt para este paso..." rows="2" style="border-color:#ff4444; background:rgba(255,0,0,0.05)"></textarea>
            </div>
            `;
    container.appendChild(stepDiv);
};

window.doPublish = () => {
    // Safety redirect for Edit Mode
    if (isEditing) return window.doUpdate();

    const postType = document.querySelector('input[name="postType"]:checked').value;
    const title = document.getElementById('upTitle').value;
    const tool = document.getElementById('upTool').value;
    const isPrivate = document.getElementById('upPrivate').checked;
    const needsReference = document.getElementById('upReference').checked;

    if (!title) { toast("El título es obligatorio", "error"); return; }

    const pubBtn = document.getElementById('pubBtn');
    if (pubBtn) {
        pubBtn.disabled = true;
        pubBtn.innerText = 'Publicando...';
    }
    toast("🚀 Publicando tu prompt...", "info");

    const extraConfig = [];
    document.querySelectorAll('.extra-config-row').forEach(row => {
        const type = row.querySelector('.extra-type').value;
        const val = row.querySelector('.extra-val').value;
        if (val.trim()) {
            extraConfig.push({ type, val: val.trim() });
        }
    });

    const resetBtn = () => {
        if (pubBtn) {
            pubBtn.disabled = false;
            pubBtn.innerText = 'Publicar';
        }
    };

    if (postType === 'single') {
        const file = document.getElementById('upFile').files[0];
        if (!file) {
            toast("Imagen obligatoria", "error");
            resetBtn();
            return;
        }
        const negPrompt = document.getElementById('upNegPrompt').value;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await store.addPrompt({
                    title,
                    tool,
                    rating: document.getElementById('upRating').value,
                    image: reader.result,
                    prompt: document.getElementById('upPrompt').value,
                    negative_prompt: negPrompt,
                    type: 'single',
                    isPrivate,
                    needsReference,
                    extraConfig,
                    tags: Array.from(window.selectedTags)
                });

                if (!res.success) {
                    toast("❌ " + res.msg, "error");
                    resetBtn();
                } else {
                    toast("✅ ¡Publicado con éxito!", "success");
                    window.resetCreateModal();
                    window.closeModals();
                    if (window.render) window.render();

                    if (window.trackEvent) window.trackEvent('publish_post', { title, tool, type: 'single' });

                    if (res.leveledUp) {
                        setTimeout(() => window.showLevelUpModal && window.showLevelUpModal(res.newLevel), 500);
                    }
                }
            } catch (err) {
                toast("❌ Error crítico: " + err.message, "error");
                resetBtn();
            }
        };
        reader.readAsDataURL(file);
    } else {
        // Sequence
        const steps = Array.from(document.querySelectorAll('.seq-step'));
        if (steps.length === 0) {
            toast("Añade al menos un paso", "warning");
            resetBtn();
            return;
        }

        const content = [];
        let loaded = 0;

        steps.forEach((step, idx) => {
            const file = step.querySelector('.seqFile').files[0];
            const prompt = step.querySelector('.seqPrompt').value;
            const negPrompt = step.querySelector('.seqNegPrompt').value;
            const rating = step.querySelector('.seqRating').value;
            if (!file) {
                toast(`Falta imagen en paso ${idx + 1}`, "error");
                resetBtn();
                return;
            }
            if (!isImageFile(file)) {
                toast(`❌ Archivo paso ${idx + 1} no es imagen`, "error");
                resetBtn();
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                content.push({ image: reader.result, prompt, negative_prompt: negPrompt, rating });
                loaded++;
                if (loaded === steps.length) {
                    store.addPrompt({
                        title,
                        tool,
                        type: 'sequence',
                        content,
                        isPrivate,
                        needsReference,
                        extraConfig,
                        tags: Array.from(window.selectedTags)
                    }).then(res => {
                        if (!res.success) {
                            toast("❌ Error: " + res.msg, "error");
                            resetBtn();
                        } else {
                            toast("✅ ¡Secuencia publicada!", "success");
                            window.resetCreateModal();
                            window.closeModals();
                            if (window.render) window.render();
                            if (window.trackEvent) window.trackEvent('publish_post', { title, tool, type: 'sequence', steps: steps.length });
                        }
                    }).catch(err => {
                        toast("❌ Error en secuencia: " + err.message, "error");
                        resetBtn();
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

window.doEditPrompt = (id) => {
    isEditing = true;
    editingId = id;
    const p = store.prompts.find(x => x.id === id);
    if (!p) return;

    // Reuse Create Modal
    document.getElementById('createModal').style.display = 'flex';
    document.getElementById('upTitle').value = p.title;
    document.getElementById('upTool').value = p.tool;
    document.getElementById('upRating').value = p.rating || 'SFW / Apto';
    document.getElementById('upPrompt').value = p.prompt || '';
    document.getElementById('upPrivate').checked = p.isPrivate;
    document.getElementById('upReference').checked = p.needsReference || p.needs_reference;

    // Load Tags
    window.selectedTags = new Set(p.tags || []);
    if (window.renderTagSelector) window.renderTagSelector();

    // Handle Type
    if (p.type === 'sequence') {
        document.querySelector('input[name="postType"][value="sequence"]').checked = true;
        window.togglePostType('sequence');
        // Rebuild sequence steps
        const container = document.getElementById('seqContainer');
        container.innerHTML = '';
        seqStepCount = 0;
        if (p.content) {
            p.content.forEach(step => {
                window.addSeqStep();
                const lastStep = container.lastElementChild;
                lastStep.querySelector('.seqPrompt').value = step.prompt;
                lastStep.querySelector('.seqRating').value = step.rating;
                // Add preview/warning about image
                const fileInput = lastStep.querySelector('.seqFile');
                const prev = document.createElement('div');
                prev.innerHTML = `<small>Imagen actual guardada. Subir nueva para reemplazar.</small><br><img src="${step.image}" style="height:50px; border:1px solid #444; margin-top:5px">`;
                fileInput.parentElement.insertBefore(prev, fileInput);
            });
        }
    } else {
        document.querySelector('input[name="postType"][value="single"]').checked = true;
        window.togglePostType('single');
        // Preview existing image for Single
        const fileInput = document.getElementById('upFile');
        // Remove existing preview if any
        const existingPrev = fileInput.parentElement.querySelector('.edit-preview');
        if (existingPrev) existingPrev.remove();

        const prev = document.createElement('div');
        prev.className = 'edit-preview';
        prev.innerHTML = `<div style="margin:10px 0"><small>Imagen actual:</small><br><img src="${p.image}" style="max-height:100px; border:1px solid #555"></div>`;
        fileInput.parentElement.insertBefore(prev, fileInput);
    }

    // Change Button - Force update at the end
    setTimeout(() => {
        const btn = document.getElementById('pubBtn');
        if (btn) {
            btn.innerText = "Actualizar";
            btn.onclick = window.doUpdate;
            console.log("Edit Mode Activated: Button updated to Actualizar");
        } else {
            console.error("Edit Mode Error: Button 'pubBtn' not found!");
        }
    }, 100);

    if (window.toggleOptionsMenu) primaryToggleOptionsMenu(); // Hacky: assumes window.toggleOptionsMenu is defined
    // Actually we should just close it if it's open.
    const menu = document.getElementById('optionsMenu');
    if (menu) menu.style.display = 'none';
};

window.doUpdate = async () => {
    try {
        const title = document.getElementById('upTitle').value;
        const tool = document.getElementById('upTool').value;
        const isPrivate = document.getElementById('upPrivate').checked;
        const needsReference = document.getElementById('upReference').checked;

        if (!title) return alert("El título es obligatorio");

        const p = store.prompts.find(x => x.id === editingId);
        if (!p) return;

        const data = {
            title, tool, rating: document.getElementById('upRating').value, prompt: document.getElementById('upPrompt').value,
            isPrivate, needsReference, type: p.type,
            tags: Array.from(window.selectedTags) // NUEVO
        };

        // Disable button during update
        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Guardando...";

        if (p.type === 'single') {
            const file = document.getElementById('upFile').files[0];
            if (file) {
                if (!isImageFile(file)) return alert("❌ El archivo seleccionado no es una imagen válida.");
                const reader = new FileReader();
                reader.onload = async () => {
                    data.image = reader.result;
                    const res = await store.updatePrompt(editingId, data);
                    if (res.success) finishUpdate();
                    else toast("Error: " + res.msg, 'error');
                };
                reader.readAsDataURL(file);
            } else {
                data.image = p.image;
                const res = await store.updatePrompt(editingId, data);
                if (res.success) finishUpdate();
                else toast("Error: " + res.msg, 'error');
            }
        } else {
            alert("Edición de secuencias en mantenimiento. Por favor borra y crea de nuevo si necesitas cambiar imágenes.");
            if (btn) btn.innerText = "Actualizar";
        }
    } catch (e) {
        console.error(e);
        alert("Error inesperado al actualizar: " + e.message);
        const btn = document.getElementById('pubBtn');
        if (btn) btn.innerText = "Actualizar";
    }
};

const finishUpdate = () => {
    toast("✅ Post actualizado", "success");
    window.resetCreateModal();
    window.closeModals();
    if (window.render) window.render();
};

window.resetCreateModal = () => {
    console.log("[CREATE-MODAL] 🧹 Iniciando reset completo del formulario...");
    isEditing = false;
    editingId = null;
    seqStepCount = 0;

    // 1. Campos de texto
    const fields = ['upTitle', 'upPrompt', 'upNegPrompt'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // 2. Selects
    const selects = ['upTool', 'upRating'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.selectedIndex = 0;
    });

    // 3. Paneles de visibilidad
    const negPanel = document.getElementById('singleNeg');
    if (negPanel) negPanel.style.display = 'none';

    // 4. Checkboxes
    const checkboxes = ['upPrivate', 'upReference'];
    checkboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });

    // 5. Archivos y Previews (CRÍTICO)
    const upFile = document.getElementById('upFile');
    if (upFile) {
        upFile.value = ''; // Limpia el nombre del archivo en el input
        console.log("[CREATE-MODAL] Input de archivo limpiado.");
    }

    const singlePrev = document.getElementById('singlePreview');
    if (singlePrev) {
        singlePrev.style.display = 'none';
        const img = singlePrev.querySelector('img');
        if (img) img.src = '';
    }

    // 6. Eliminar elementos dinámicos (Edit Previews y filas extra)
    document.querySelectorAll('.edit-preview').forEach(el => el.remove());

    const extraRows = document.getElementById('extraRowsContainer');
    if (extraRows) extraRows.innerHTML = '';

    const extraPanel = document.getElementById('upExtraConfig');
    if (extraPanel) extraPanel.style.display = 'none';

    const seqContainer = document.getElementById('seqContainer');
    if (seqContainer) seqContainer.innerHTML = '';

    // 7. Tags
    if (window.selectedTags) window.selectedTags.clear();
    else window.selectedTags = new Set();

    if (window.renderTagSelector) window.renderTagSelector();

    // 8. Restaurar Botón a estado inicial
    const btn = document.getElementById('pubBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Publicar";
        console.log("[CREATE-MODAL] Botón restaurado a 'Publicar'");
    }

    // 9. Volver a vista Single
    const singleRadio = document.querySelector('input[name="postType"][value="single"]');
    if (singleRadio) {
        singleRadio.checked = true;
        window.togglePostType('single');
    }

    console.log("[CREATE-MODAL] ✅ Formulario limpio.");
};
