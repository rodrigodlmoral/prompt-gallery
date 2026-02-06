/**
 * Servicio de carga de imágenes para Cloudinary V2 (Simplificado)
 * Con deduplicación básica y manejo robusto de errores
 */

const CLOUD_NAME = 'du0oasfjl';
const UPLOAD_PRESET = 'prompt_gallery';

/**
 * Sube un archivo a Cloudinary
 * @param {File|Blob} file - El archivo de imagen a subir
 * @returns {Promise<string>} - La URL segura de la imagen
 */
export async function uploadToCloudinary(file) {
    if (!file) throw new Error('No se proporcionó ningún archivo');

    try {


        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        // Usar timestamp + random para evitar colisiones
        const uniqueId = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        formData.append('public_id', uniqueId);


        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la carga a Cloudinary');
        }

        const data = await response.json();


        return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
    } catch (error) {
        console.error('❌ Error subiendo a Cloudinary:', error);
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
