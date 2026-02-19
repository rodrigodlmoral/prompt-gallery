/**
 * Servicio de carga de imágenes para Cloudinary V2 (Simplificado)
 * Con deduplicación básica y manejo robusto de errores
 */

const CLOUD_NAME = 'du0oasfjl';
const UPLOAD_PRESET = 'prompt_gallery';

const CLOUD_NAME_HD = 'dcs9gpbqp';
const UPLOAD_PRESET_HD = 'prompt_gallery_hd';

/**
 * Sube un archivo a Cloudinary (Main Account - Web Optimized)
 */
export async function uploadToCloudinary(file) {
    return _upload(file, CLOUD_NAME, UPLOAD_PRESET, true);
}

/**
 * Sube un archivo a Cloudinary (HD Account - High Quality for Social)
 */
export async function uploadToCloudinaryHD(file) {
    return _upload(file, CLOUD_NAME_HD, UPLOAD_PRESET_HD, false);
}

async function _upload(file, cloudName, preset, autoOptimize) {
    if (!file) throw new Error('No se proporcionó ningún archivo');

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        const uniqueId = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        formData.append('public_id', uniqueId);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la carga a Cloudinary');
        }

        const data = await response.json();
        let url = data.secure_url;

        if (autoOptimize) {
            url = url.replace('/upload/', '/upload/f_auto,q_auto/');
        }

        return url;
    } catch (error) {
        console.error(`❌ Error subiendo a Cloudinary (${cloudName}):`, error);
        throw error;
    }
}

/**
 * Descarga una imagen desde una URL y la convierte en File
 * @param {string} url - URL de la imagen
 * @returns {Promise<File>} - Archivo descargado
 */
export async function downloadImageAsFile(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('No se pudo descargar la imagen');

        const blob = await response.blob();
        const filename = url.split('/').pop() || 'image.png';

        return new File([blob], filename, { type: blob.type });
    } catch (error) {
        console.error('❌ Error descargando imagen:', error);
        throw error;
    }
}
