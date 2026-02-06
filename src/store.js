import { pb } from './pocketbase.js';
import { uploadToCloudinary } from './uploadService.js';

// --- GOOGLE ANALYTICS HELPER ---
window.trackEvent = (name, params = {}) => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
        console.log(`[GA4] Event tracked: ${name}`, params);
    }
};

const LEVEL_REQS = [
    { posts: 0, copies: 0, name: 'Explorador', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'], icon: '🛡️', color: '#888' },
    { posts: 10, copies: 0, name: 'Novato', benefits: ['Publicar Secuencias (Multi-imagen)'], icon: '🌱', color: '#4caf50' },
    { posts: 25, copies: 0, name: 'Creador Jr', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'], icon: '🎨', color: '#2196f3' },
    { posts: 50, copies: 15, name: 'Creador', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'], icon: '🏆', color: '#ff9800' },
    { posts: 100, copies: 40, name: 'Artista', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'], icon: '💎', color: '#9c27b0' },
    { posts: 250, copies: 80, name: 'Maestro', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'], icon: '👑', color: 'gold' }
];

// STORE (Estado global simple)
const store = {
    prompts: [],
    currentUser: null,
    usersCache: {}, // { username: { ...profileData } }
    users: [],      // Admin list

    async init() {
        if (pb.authStore.isValid && pb.authStore.model) {
            await this._loadUserProfile(pb.authStore.model.id);
        }
        await this.loadPrompts();
    },

    async _loadUserProfile(userId) {
        try {
            const profile = await pb.collection('users').getOne(userId);
            if (profile) {
                profile.avatar = profile.avatar_url || profile.avatar;
                profile.username = profile.name; // PocketBase usa 'name', no 'username'

                // --- DYNAMIC AUTO-SYNC & ROBUSTNESS ---
                try {
                    const stats = await pb.collection('prompts').getList(1, 1, {
                        filter: `author = "${userId}"`,
                        fields: 'id'
                    });
                    const realPosts = stats.totalItems || 0;

                    // Si el valor en DB es distinto al real, lo corregimos físicamente en la DB
                    if (profile.prompts_count !== realPosts) {
                        await pb.collection('users').update(userId, {
                            prompts_count: realPosts
                        });
                        profile.prompts_count = realPosts;
                    }
                } catch (e) {
                    console.warn("Auto-sync error:", e);
                }

                this.currentUser = profile;
            }
        } catch (error) {
            console.warn("Perfil no encontrado o error:", error);
            if (pb.authStore.model) {
                this.currentUser = {
                    ...pb.authStore.model,
                    username: pb.authStore.model.name || 'Usuario',
                    level: 0, xp: 0, tokens: 0, prompts_count: 0, total_copies: 0
                };
            }
        }
        return this.currentUser;
    },

    async loadPrompts() {
        try {
            // NO usar sort: '-created' porque causa error 400 en PocketHost
            const records = await pb.collection('prompts').getList(1, 100);

            // Ordenar en el cliente
            const sortedItems = records.items.sort((a, b) => {
                return new Date(b.created) - new Date(a.created);
            });

            this.prompts = sortedItems.map(p => ({
                id: p.id,
                title: p.title,
                prompt: p.prompt,
                negative_prompt: p.negative_prompt,
                image: p.image_url || p.image, // Normalización de campo de imagen
                author: p.author_name || p.expand?.author?.name || 'Explorador',
                author_id: p.author,
                createdAt: new Date(p.created || p.created_at_original).getTime(),
                created_at: p.created,
                reactions: p.reactions || { like: 0, love: 0, fire: 0, funny: 0 },
                comments: p.comments || [],
                savedBy: p.saved_by || [],
                saved_by: p.saved_by || [],
                type: p.type || 'single',
                content: p.content || [],

                // NUEVOS CAMPOS POST-MIGRACIÓN
                tokens_received: p.tokens_received || 0,
                rating: p.rating || 'SFW / Apto',
                is_private: p.is_private === true || p.isPrivate === true,
                copy_count: p.copy_count || 0,
                admin_featured: p.admin_featured || false,
                is_featured: p.is_featured || false,
                featured_until: p.featured_until || null,
                tool: p.tool || 'ChatGPT',
                content: p.content || [],
                profiles: p.expand?.author ? {
                    username: p.expand.author.username,
                    avatar_url: p.expand.author.avatar_url,
                    level: p.expand.author.level
                } : null
            }));

            if (window.render) window.render();
        } catch (error) {
            console.error("Error loading prompts:", error);
            this.prompts = [];
        }
        return this.prompts;
    },

    async fetchUserProfileByUsername(username) {
        if (this.usersCache[username] && (Date.now() - this.usersCache[username]._fetchedAt < 60000)) {
            return this.usersCache[username];
        }

        try {
            const record = await pb.collection('users').getFirstListItem(`username="${username}"`);
            if (record) {
                const normalized = window.normalizeProfile ? window.normalizeProfile(record) : record;

                // --- ROBUST STATS SYNC FOR OTHER USERS ---
                if (normalized.prompts_count === undefined) {
                    try {
                        const stats = await pb.collection('prompts').getList(1, 1, {
                            filter: `author = "${record.id}"`,
                            fields: 'id'
                        });
                        normalized.prompts_count = stats.totalItems || 0;
                    } catch (e) {
                        normalized.prompts_count = 0;
                    }
                }

                this.usersCache[username] = normalized;
                this.usersCache[username]._fetchedAt = Date.now();
                return this.usersCache[username];
            }
        } catch (err) {
            console.warn("Error fetching user profile:", err);
        }
        return null;
    },

    async logActivity(action, details = {}) {
        if (!this.currentUser) return;
        try {
            await pb.collection('activity_logs').create({
                user: this.currentUser.id,
                action: action,
                details: details
            });
            window.trackEvent(action, details);
        } catch (err) {
            console.warn("Failed to log activity:", err);
        }
    },

    async getActivityLogs() {
        try {
            const records = await pb.collection('activity_logs').getList(1, 100, {
                sort: '-created',
                expand: 'user'
            });
            // Adaptar para el admin.js
            return records.items.map(l => ({
                ...l,
                username: l.expand?.user?.username || 'Desconocido',
                created_at: l.created
            }));
        } catch (err) {
            console.error("Error fetching logs:", err);
            return [];
        }
    },

    async getUserActivityLogs() {
        if (!this.currentUser) return [];
        try {
            const records = await pb.collection('activity_logs').getList(1, 50, {
                filter: `user = "${this.currentUser.id}"`,
                sort: '-created'
            });
            return records.items.map(l => ({ ...l, created_at: l.created }));
        } catch (err) {
            console.error("Error fetching user logs:", err);
            return [];
        }
    },

    userLogSubscription: null,
    subscribeToUserLogs(callback) {
        if (!this.currentUser) return;
        this.unsubscribeUserLogs();
        pb.collection('activity_logs').subscribe('*', (e) => {
            if (e.action === 'create' && e.record.user === this.currentUser.id) {
                callback({ ...e.record, created_at: e.record.created });
            }
        });
        this.userLogSubscription = true;
    },

    unsubscribeUserLogs() {
        if (this.userLogSubscription) {
            pb.collection('activity_logs').unsubscribe('*');
            this.userLogSubscription = null;
        }
    },

    privateLogSubscription: null,
    subscribeToLogs(callback) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return;
        this.unsubscribeLogs();
        pb.collection('activity_logs').subscribe('*', (e) => {
            if (e.action === 'create') {
                callback({ ...e.record, created_at: e.record.created, username: e.record.author_name || 'Admin UI' });
            }
        });
        this.privateLogSubscription = true;
    },

    unsubscribeLogs() {
        if (this.privateLogSubscription) {
            pb.collection('activity_logs').unsubscribe('*');
            this.privateLogSubscription = null;
        }
    },

    async getTopCreators() {
        try {
            const records = await pb.collection('users').getList(1, 10, {
                sort: '-prompts_count'
            });
            return records.items.map(p => window.normalizeProfile ? window.normalizeProfile(p) : p);
        } catch (err) {
            return [];
        }
    },

    // --- CONTENT ACTIONS ---

    async addPrompt(data) {
        if (!this.currentUser) return { success: false, msg: "Inicia sesión para publicar" };

        let imageUrl = '';
        const uploadImage = async (base64) => {
            const compressed = await this._compressImage(base64);
            const file = this._dataURLtoFile(compressed, 'upload.webp');
            return await uploadToCloudinary(file);
        };

        let processedContent = [];
        try {
            if (data.image && data.image.startsWith('data:')) {
                imageUrl = await uploadImage(data.image);
            }
            if (data.content && Array.isArray(data.content)) {
                processedContent = await Promise.all(data.content.map(async (step) => {
                    let stepUrl = step.image;
                    if (step.image && step.image.startsWith('data:')) {
                        stepUrl = await uploadImage(step.image);
                    }
                    return { ...step, image: stepUrl };
                }));
            }
        } catch (err) {
            return { success: false, msg: "Error al subir imágenes: " + err.message };
        }

        try {
            const record = await pb.collection('prompts').create({
                title: data.title,
                prompt: data.prompt,
                negative_prompt: data.negative_prompt,
                image: imageUrl,
                author: this.currentUser.id,
                author_name: this.currentUser.username,
                type: data.type || 'single',
                is_private: data.isPrivate || false,
                tool: data.tool,
                rating: data.rating,
                content: processedContent,
                reactions: { like: 0, love: 0, fire: 0, funny: 0 },
                comments: [],
                saved_by: []
            });

            // --- LEVEL UP LOGIC (POSTS + COPIAS) ---
            const oldLevel = this.currentUser.level || 0;

            // Obtener total de posts
            const userPrompts = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${this.currentUser.id}"`
            });
            const totalPosts = userPrompts.totalItems;

            // Obtener total de copias de TODOS los prompts del usuario
            const allPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${this.currentUser.id}"`
            });
            const totalCopies = allPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calcular nivel (considerando posts Y copias)
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts && totalCopies >= req.copies) {
                    newLevel = idx;
                }
            });

            let leveledUp = false;
            if (newLevel > oldLevel) {
                leveledUp = true;
                await pb.collection('users').update(this.currentUser.id, {
                    level: newLevel,
                    prompts_count: totalPosts,
                    total_copies: totalCopies,
                    tokens: (this.currentUser.tokens || 0) + 10 // Bonus for level up
                });
            } else {
                // Just regular reward (1 token per post)
                await pb.collection('users').update(this.currentUser.id, {
                    tokens: (this.currentUser.tokens || 0) + 1,
                    prompts_count: totalPosts, // Physical backup
                    total_copies: totalCopies   // Physical backup
                });
            }

            await this._loadUserProfile(this.currentUser.id);
            await this.loadPrompts();
            this.logActivity('publish', { postId: data.title, type: data.type });

            return {
                success: true,
                leveledUp: leveledUp,
                newLevel: newLevel,
                tokensEarned: leveledUp ? 10 : 1
            };
        } catch (err) {
            console.error("Publish error:", err);
            return { success: false, msg: "Error al guardar en base de datos: " + err.message };
        }
    },

    async updatePrompt(id, data) {
        if (!this.currentUser) return { success: false };
        let imageUrl = data.image;

        if (data.image && data.image.startsWith('data:')) {
            try {
                const compressed = await this._compressImage(data.image);
                const file = this._dataURLtoFile(compressed, 'update.webp');
                imageUrl = await uploadToCloudinary(file);
            } catch (err) {
                return { success: false, msg: "Error subiendo imagen" };
            }
        }

        try {
            await pb.collection('prompts').update(id, {
                title: data.title,
                prompt: data.prompt,
                negative_prompt: data.negative_prompt,
                image: imageUrl,
                is_private: data.isPrivate,
                tool: data.tool,
                rating: data.rating,
                content: data.content
            });
            await this.loadPrompts();
            return { success: true };
        } catch (err) {
            return { success: false };
        }
    },

    async removePrompt(id) {
        try {
            await pb.collection('prompts').delete(id);
            this.prompts = this.prompts.filter(p => p.id !== id);
            if (window.render) window.render();
            return { success: true };
        } catch (err) {
            return { success: false, msg: "Error al eliminar" };
        }
    },

    async toggleReaction(postId, type) {
        if (!this.currentUser) return { success: false };
        const prompt = this.prompts.find(p => String(p.id) === String(postId));
        if (!prompt) return { success: false };

        let reactions = { ...(prompt.reactions || { like: 0, love: 0, fire: 0, funny: 0 }) };
        reactions[type] = (reactions[type] || 0) + 1;

        try {
            await pb.collection('prompts').update(postId, { reactions: reactions });
            this.logActivity(type, { postTitle: prompt.title || 'Post' });
            return { success: true, count: reactions[type] };
        } catch (error) { return { success: false }; }
    },

    async addComment(postId, text) {
        if (!this.currentUser) return { success: false };
        const prompt = this.prompts.find(p => String(p.id) === String(postId));
        if (!prompt) return { success: false };

        const newComment = {
            user: this.currentUser.username,
            avatar: this.currentUser.avatar || `https://robohash.org/${this.currentUser.username}`,
            text: text.trim(),
            date: new Date().toISOString()
        };

        const comments = [...(prompt.comments || []), newComment];
        try {
            await pb.collection('prompts').update(postId, { comments: comments });
            prompt.comments = comments;
            this.logActivity('comment', { postTitle: prompt.title });
            return { success: true };
        } catch (error) { return { success: false }; }
    },

    async toggleSave(id) {
        if (!this.currentUser) return;
        const prompt = this.prompts.find(p => String(p.id) === String(id));
        if (!prompt) return;

        const savedBy = [...(prompt.savedBy || [])];
        const idx = savedBy.indexOf(this.currentUser.username);
        if (idx > -1) savedBy.splice(idx, 1);
        else savedBy.push(this.currentUser.username);

        try {
            await pb.collection('prompts').update(id, { saved_by: savedBy });
            prompt.savedBy = savedBy;
            prompt.saved_by = savedBy;
            if (window.render) window.render();
        } catch (err) { console.warn("Save failed"); }
    },

    async boostPost(postId) {
        if (!this.currentUser || this.currentUser.tokens < 50) return { success: false, msg: 'Saldo insuficiente' };
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);

        try {
            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { tokens: this.currentUser.tokens - 50 });
            batch.collection('prompts').update(postId, { is_featured: true, featured_until: featuredUntil.toISOString() });
            await batch.send();
            this.currentUser.tokens -= 50;
            return { success: true, msg: '¡Prompt destacado!' };
        } catch (err) { return { success: false }; }
    },

    async sendTip(postId, amount, recipientId = null) {
        if (!this.currentUser || this.currentUser.tokens < amount) return { success: false, msg: 'Saldo insuficiente' };
        try {
            let actualRecipientId = recipientId;
            let authorUsername = '';
            if (postId) {
                const prompt = this.prompts.find(p => String(p.id) === String(postId));
                if (prompt) { actualRecipientId = prompt.author_id; authorUsername = prompt.author; }
            }
            if (!actualRecipientId) return { success: false };

            const recipient = await pb.collection('users').getOne(actualRecipientId);
            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { tokens: this.currentUser.tokens - amount });
            batch.collection('users').update(actualRecipientId, { tokens: (recipient.tokens || 0) + amount });
            batch.collection('activity_logs').create({
                user: this.currentUser.id,
                action: 'send_tip',
                details: { amount, recipient: authorUsername || actualRecipientId }
            });
            await batch.send();
            await this._loadUserProfile(this.currentUser.id);
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    async followUser(targetUsername) {
        if (!this.currentUser) return { success: false };
        try {
            // Find target user
            const target = await pb.collection('users').getFirstListItem(`username="${targetUsername}"`);
            if (!target) return { success: false };

            const following = [...(this.currentUser.following || [])];
            const followers = [...(target.followers || [])];

            const idx = following.indexOf(target.id);
            if (idx > -1) {
                // Unfollow
                following.splice(idx, 1);
                const fIdx = followers.indexOf(this.currentUser.id);
                if (fIdx > -1) followers.splice(fIdx, 1);
            } else {
                // Follow
                following.push(target.id);
                followers.push(this.currentUser.id);
            }

            const batch = pb.createBatch();
            batch.collection('users').update(this.currentUser.id, { following });
            batch.collection('users').update(target.id, { followers });
            await batch.send();

            this.currentUser.following = following;
            this.logActivity('follow', { target: targetUsername });
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    async fetchUserProfileByUsername(username) {
        try {
            const user = await pb.collection('users').getFirstListItem(`username="${username}"`);
            return window.normalizeProfile ? window.normalizeProfile(user) : user;
        } catch (err) { return null; }
    },

    async updateUserSettings(data) {
        if (!this.currentUser) return { success: false };
        try {
            const updateData = {
                username: data.username,
                socials: data.socials,
                moderation: data.moderation
            };
            if (data.avatar) updateData.avatar_url = data.avatar;

            const record = await pb.collection('users').update(this.currentUser.id, updateData);
            this.currentUser = { ...this.currentUser, ...record };
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    async changePassword(newPass) {
        if (!this.currentUser) return { success: false };
        try {
            await pb.collection('users').update(this.currentUser.id, {
                password: newPass,
                passwordConfirm: newPass
            });
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    async deleteAccount() {
        if (!this.currentUser) return { success: false };
        try {
            await pb.collection('users').delete(this.currentUser.id);
            this.logout();
            return { success: true };
        } catch (err) { return { success: false }; }
    },

    // --- ADMIN ACTIONS ---

    async adminLoadAllUsers() {
        try {
            const records = await pb.collection('users').getFullList({ sort: '-created' });
            this.users = records.map(r => ({ ...r, avatar: r.avatar_url || r.avatar }));
            return this.users;
        } catch (err) { return []; }
    },

    getAllUsers() { return this.users; },

    async adminUpdateUser(userId, data) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return { success: false };
        try {
            await pb.collection('users').update(userId, {
                level: data.level,
                badges: data.badges,
                role: data.role // Added role update
            });
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    async adminDeleteUser(userId) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return { success: false };
        try {
            await pb.collection('users').delete(userId);
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    async giftTokens(userId, amount) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return { success: false };
        try {
            const user = await pb.collection('users').getOne(userId);
            await pb.collection('users').update(userId, { tokens: (user.tokens || 0) + parseInt(amount) });
            await this.adminLoadAllUsers();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    async adminUpdatePrompt(id, data) {
        if (!this.currentUser || this.currentUser.role !== 'admin') return { success: false };
        try {
            await pb.collection('prompts').update(id, data);
            await this.loadPrompts();
            return { success: true };
        } catch (err) { return { success: false, msg: err.message }; }
    },

    // --- AUTH ---

    async login(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            if (authData) {
                await this._loadUserProfile(authData.record.id);
                location.reload();
                return { success: true };
            }
        } catch (error) { return { success: false, msg: "Credenciales inválidas" }; }
    },

    async register(email, username, password) {
        try {
            await pb.collection('users').create({
                username, email, password, passwordConfirm: password,
                name: username, tokens: 100, level: 0, xp: 0, role: 'user'
            });
            return { success: true };
        } catch (error) { return { success: false, msg: "Error al crear cuenta" }; }
    },

    async logout() {
        pb.authStore.clear();
        location.reload();
    },

    async recoverPassword(email) {
        try {
            await pb.collection('users').requestPasswordReset(email);
            return { success: true, msg: "Instrucciones enviadas a tu correo." };
        }
        catch (err) { return { success: false, msg: "Error al enviar correo." }; }
    },

    async confirmResetPassword(token, password, userOrEmail) {
        try {
            // 1. Confirmar el cambio de contraseña
            await pb.collection('users').confirmPasswordReset(token, password, password);

            // 2. Login automático inmediatamente
            return await this.login(userOrEmail, password);
        } catch (err) {
            console.error("Reset error:", err);
            return { success: false, msg: "El link ha expirado o es inválido." };
        }
    },

    // --- HELPERS ---

    _compressImage(base64) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const MAX = 1400;
                if (width > MAX) { height = (MAX / width) * height; width = MAX; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', 0.8));
            };
            img.src = base64;
        });
    },

    _dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: mime });
    },

    // --- COPY COUNT TRACKING CON ANTI-SPAM ---
    async incrementCopyCount(promptId) {
        const COPY_COOLDOWN = 10000; // 10 segundos
        const now = Date.now();
        const userId = this.currentUser?.id || 'anon';
        const key = `${userId}_${promptId}`;

        // Cooldown anti-spam
        if (!window._lastCopyTime) window._lastCopyTime = {};
        if (window._lastCopyTime[key] && (now - window._lastCopyTime[key]) < COPY_COOLDOWN) {
            console.warn('⏱️ Cooldown activo para copias (10s)');
            return { success: false, msg: 'Espera unos segundos antes de copiar de nuevo' };
        }

        window._lastCopyTime[key] = now;

        try {
            const prompt = await pb.collection('prompts').getOne(promptId);

            // Anti-spam: No incrementar si el autor copia su propio prompt
            if (this.currentUser && prompt.author === this.currentUser.id) {
                console.log('🚫 Auto-copia detectada, no se incrementa contador');
                return { success: true, selfCopy: true };
            }

            const newCount = (prompt.copy_count || 0) + 1;
            await pb.collection('prompts').update(promptId, {
                copy_count: newCount
            });

            // Verificar si el autor debe subir de nivel
            await this._checkAuthorLevelUp(prompt.author);

            console.log(`✅ Copy count incrementado: ${newCount}`);
            return { success: true, count: newCount };
        } catch (err) {
            console.error('❌ Error incrementando copy_count:', err);
            return { success: false, msg: err.message };
        }
    },

    // --- VERIFICACIÓN AUTOMÁTICA DE NIVEL DEL AUTOR ---
    async _checkAuthorLevelUp(authorId) {
        try {
            // Obtener todos los prompts del autor
            const authorPrompts = await pb.collection('prompts').getFullList({
                filter: `author = "${authorId}"`
            });

            const totalPosts = authorPrompts.length;
            const totalCopies = authorPrompts.reduce((sum, p) => sum + (p.copy_count || 0), 0);

            // Calcular nivel correcto basado en posts Y copias
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts && totalCopies >= req.copies) {
                    newLevel = idx;
                }
            });

            // Obtener nivel actual del autor
            const author = await pb.collection('users').getOne(authorId);

            // Si el nivel, posts o copias cambiaron, actualizar
            if (newLevel > (author.level || 0) || author.prompts_count !== totalPosts || author.total_copies !== totalCopies) {
                await pb.collection('users').update(authorId, {
                    level: Math.max(newLevel, author.level || 0),
                    prompts_count: totalPosts,
                    total_copies: totalCopies
                });
                if (newLevel > (author.level || 0)) {
                    console.log(`🎉 Usuario ${author.username} subió a Nivel ${newLevel} (${LEVEL_REQS[newLevel].name})!`);
                }
            }
        } catch (err) {
            console.warn('⚠️ Error checking author level:', err);
        }
    }
};

window.store = store;
export { store };
