
// --- DOM UTILS ---

export const isImageFile = (file) => {
    return file && file.type.startsWith('image/');
};

export const previewFile = (file, imgId, containerId) => {
    if (!file || !(file instanceof Blob)) {
        console.warn("[DOM] Invalid file for preview:", file);
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById(imgId);
        const cont = document.getElementById(containerId);
        if (img) img.src = e.target.result;
        if (cont) cont.style.display = 'block';
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
