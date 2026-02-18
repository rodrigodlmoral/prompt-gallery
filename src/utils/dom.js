
// --- DOM UTILS ---

export const isImageFile = (file) => {
    return file && file.type.startsWith('image/');
};

export const previewFile = (arg1, arg2, arg3) => {
    let file = arg1;
    let container = null;
    let img = null;

    // Escenario 1: Llamada desde HTML (this, 'containerId') -> Compatibilidad con CreateModal/Profile
    if (arg1 instanceof HTMLInputElement) {
        if (arg1.files && arg1.files[0]) {
            file = arg1.files[0];
        } else {
            return; // No file selected
        }

        container = document.getElementById(arg2);
        if (container) {
            img = container.querySelector('img');
            // Si no encuentra img dentro, asumimos que arg2 podría ser la imagen misma (fallback)
            if (!img && container.tagName === 'IMG') {
                img = container;
                container = null; // No hay contenedor que mostrar
            }
        }
    }
    // Escenario 2: Llamada pura Directa (File, imgId, containerId) -> Compatibilidad Legacy
    else {
        if (arg2) img = document.getElementById(arg2);
        if (arg3) container = document.getElementById(arg3);
    }

    // Validación Final
    if (!file || !(file instanceof Blob)) {
        // Solo warn si no es un reset de formulario
        if (file !== undefined && file !== null) {
            console.warn("[DOM] Invalid file for preview:", file);
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        if (img) {
            img.src = e.target.result;
            // Hotfix: Asegurar que la imagen sea visible si estaba oculta
            img.style.display = 'block';
        }
        if (container) {
            // Usamos flex para centrar si es un div de preview estándar
            container.style.display = 'flex';
        }
    };
    try {
        reader.readAsDataURL(file);
    } catch (err) {
        console.error("[DOM] FileReader Error:", err);
    }
};

export const togglePass = (fieldId, btn) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
    } else {
        input.type = 'password';
        btn.innerText = '👁️';
    }
};
