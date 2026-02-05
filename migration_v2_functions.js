// MIGRATION V2 - REPLACEMENT SECTION
// This file contains ONLY the migration functions to be inserted into store.js

    // --- MIGRATION TOOL V2 (SUPABASE -> CLOUDINARY) ---
    // Bulletproof version with deduplication, atomic operations, and rollback
    async migrateOldImages(onProgress, ignoredIds = []) {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
        return { count: 0, done: true, error: 'No admin' };
    }

    console.log("🚀 Iniciando Migración V2 (Bulletproof)...");

    // 1. Calcular total EXACTO de posts pendientes
    const { count: totalPending } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true })
        .ilike('image_url', '%supabase.co%');

    console.log(`📊 Total pendiente: ${totalPending} posts`);

    if (totalPending === 0) {
        return { count: 0, done: true, totalPending: 0 };
    }

    // 2. Obtener lote de posts (procesamos de 10 en 10 para seguridad)
    let query = supabase
        .from('prompts')
        .select('*')
        .ilike('image_url', '%supabase.co%')
        .limit(10);

    if (ignoredIds.length > 0) {
        query = query.not('id', 'in', `(${ignoredIds.join(',')})`);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) {
        return { count: 0, done: true, fatal: fetchError.message };
    }

    if (!posts || posts.length === 0) {
        return { count: 0, done: true, totalPending: 0 };
    }

    // 3. Procesar cada post con operación atómica
    let successCount = 0;
    const failedIds = [];
    const migrationLog = [];

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        if (onProgress) {
            onProgress(i + 1, posts.length, post.title, totalPending);
        }

        const result = await this._migratePostAtomic(post);

        if (result.success) {
            successCount++;
            migrationLog.push(`✅ ${post.title}: ${result.message}`);
        } else {
            failedIds.push(post.id);
            migrationLog.push(`❌ ${post.title}: ${result.error}`);
        }
    }

    console.log("📋 Migration Log:", migrationLog);

    return {
        count: successCount,
        done: false,
        totalPending: totalPending - successCount,
        failedIds: failedIds,
        log: migrationLog
    };
},

    /**
     * Migra un post completo de forma atómica (todo o nada)
     * Incluye cover + secuencias si las hay
     */
    async _migratePostAtomic(post) {
    const originalImageUrl = post.image_url;
    const originalContent = post.content;
    let newImageUrl = null;
    let newContent = null;
    let dbUpdated = false;

    try {
        // PASO 1: Migrar imagen principal (cover)
        if (originalImageUrl && originalImageUrl.includes('supabase.co')) {
            console.log(`📥 Descargando cover: ${post.title}`);
            newImageUrl = await this._migrateImage(originalImageUrl);

            if (!newImageUrl) {
                throw new Error('Failed to migrate cover image');
            }
        }

        // PASO 2: Migrar imágenes de secuencia (si existen)
        if (originalContent && Array.isArray(originalContent) && originalContent.length > 0) {
            console.log(`📥 Migrando secuencia (${originalContent.length} pasos)`);
            newContent = [];

            for (const step of originalContent) {
                if (step.image && step.image.includes('supabase.co')) {
                    const newStepUrl = await this._migrateImage(step.image);
                    newContent.push({ ...step, image: newStepUrl });
                } else {
                    newContent.push(step);
                }
            }
        }

        // PASO 3: Actualizar DB (operación crítica)
        const updatePayload = {};
        if (newImageUrl) updatePayload.image_url = newImageUrl;
        if (newContent) updatePayload.content = newContent;

        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabase
                .from('prompts')
                .update(updatePayload)
                .eq('id', post.id);

            if (updateError) {
                throw new Error(`DB update failed: ${updateError.message}`);
            }

            dbUpdated = true;
            console.log(`✅ DB actualizada para: ${post.title}`);
        }

        // PASO 4: SOLO SI TODO OK → Borrar archivos de Supabase
        if (dbUpdated) {
            if (originalImageUrl && originalImageUrl.includes('supabase.co')) {
                await this._deleteFromSupabaseStorage(originalImageUrl);
            }

            if (originalContent && Array.isArray(originalContent)) {
                for (const step of originalContent) {
                    if (step.image && step.image.includes('supabase.co')) {
                        await this._deleteFromSupabaseStorage(step.image);
                    }
                }
            }
        }

        return {
            success: true,
            message: `Migrated successfully (${newContent ? 'sequence' : 'single'})`
        };

    } catch (error) {
        console.error(`❌ Migration failed for post ${post.id}:`, error);

        // ROLLBACK: Si actualizamos DB pero algo falló, intentar revertir
        if (dbUpdated) {
            console.warn(`⚠️ Attempting rollback for post ${post.id}`);
            try {
                const rollbackPayload = {};
                if (originalImageUrl) rollbackPayload.image_url = originalImageUrl;
                if (originalContent) rollbackPayload.content = originalContent;

                await supabase
                    .from('prompts')
                    .update(rollbackPayload)
                    .eq('id', post.id);

                console.log(`✅ Rollback successful for post ${post.id}`);
            } catch (rollbackError) {
                console.error(`❌ Rollback failed for post ${post.id}:`, rollbackError);
            }
        }

        return {
            success: false,
            error: error.message
        };
    }
},

    /**
     * Migra una imagen individual con deduplicación
     * @param {string} supabaseUrl - URL de Supabase
     * @returns {Promise<string>} - Nueva URL de Cloudinary
     */
    async _migrateImage(supabaseUrl) {
    try {
        // 1. Descargar de Supabase
        const response = await fetch(supabaseUrl);
        if (!response.ok) {
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const file = new File([blob], 'migrated.png', { type: blob.type });

        // 2. Subir a Cloudinary (con deduplicación automática)
        const cloudinaryUrl = await uploadToCloudinary(file);

        return cloudinaryUrl;

    } catch (error) {
        console.error('❌ Image migration failed:', error);
        throw error;
    }
},

    async _deleteFromSupabaseStorage(fullUrl) {
    try {
        const parts = fullUrl.split('/images/');
        if (parts.length < 2) return;
        const path = parts[1];

        const { error } = await supabase.storage.from('images').remove([path]);
        if (error) {
            console.warn(`⚠️ Supabase delete warning: ${error.message}`);
        } else {
            console.log(`🗑️ Deleted from Supabase: ${path}`);
        }
    } catch (e) {
        console.warn('⚠️ Delete failed:', e);
    }
},
