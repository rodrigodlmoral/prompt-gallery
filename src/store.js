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
    { posts: 0, name: 'Explorador', benefits: ['Comentar en prompts', 'Guardar favoritos', 'Enviar PromptBits'], icon: '🛡️', color: '#888' },
    { posts: 10, name: 'Iniciado', benefits: ['Publicar Secuencias (Multi-imagen)'], icon: '🎖️', color: '#4caf50' },
    { posts: 25, name: 'Principiante', benefits: ['Cambiar foto de perfil', 'Añadir redes sociales al perfil'], icon: '🏅', color: '#2196f3' },
    { posts: 50, name: 'Contribuidor', benefits: ['Sin cooldown en comentarios', 'Medalla especial de plata'], icon: '🥇', color: '#ff9800' },
    { posts: 100, name: 'Autor', benefits: ['Destacar tus propios posts (Self-Promo)', 'Panel de estadísticas avanzado'], icon: '💎', color: '#9c27b0' },
    { posts: 250, name: 'COLABORADOR', benefits: ['Herramientas de moderación básica', 'Soporte prioritario 24/7'], icon: '✨', color: 'gold' }
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
                this.currentUser = profile;
            }
        } catch (error) {
            console.warn("Perfil no encontrado o error:", error);
            if (pb.authStore.model) {
                this.currentUser = {
                    ...pb.authStore.model,
                    username: pb.authStore.model.username || 'Usuario',
                    level: 0, xp: 0, tokens: 0
                };
            }
        }
        return this.currentUser;
    },

    async loadPrompts() {
        try {
            const records = await pb.collection('prompts').getList(1, 100, {
                sort: '-created',
                expand: 'author'
            });

            this.prompts = records.items.map(p => ({
                id: p.id,
                title: p.title,
                prompt: p.prompt,
                negative_prompt: p.negative_prompt,
                image: p.image_url || p.image, // Normalización de campo de imagen
                author: p.author_name || p.expand?.author?.username || 'Explorador',
                author_id: p.author,
                createdAt: new Date(p.created || p.created_at_original).getTime(),
                created_at: p.created,
                reactions: p.reactions || { like: 0, love: 0, fire: 0, funny: 0 },
                comments: p.comments || [],
                savedBy: p.saved_by || [],
                saved_by: p.saved_by || [],
                type: p.type || 'single',
                isPrivate: p.is_private || p.isPrivate || false, // Normalización de privacidad
                admin_featured: p.admin_featured || false,
                is_featured: p.is_featured || false,
                featured_until: p.featured_until || null,
                tool: p.tool || 'ChatGPT',
                rating: p.rating || 'SFW / Apto',
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

            // --- LEVEL UP LOGIC ---
            const oldLevel = this.currentUser.level || 0;
            // Fetch total prompts count from DB for accuracy
            const userPrompts = await pb.collection('prompts').getList(1, 1, {
                filter: `author = "${this.currentUser.id}"`
            });
            const totalPosts = userPrompts.totalItems;

            // Calculate new level
            let newLevel = 0;
            LEVEL_REQS.forEach((req, idx) => {
                if (totalPosts >= req.posts) newLevel = idx;
            });

            let leveledUp = false;
            if (newLevel > oldLevel) {
                leveledUp = true;
                await pb.collection('users').update(this.currentUser.id, {
                    level: newLevel,
                    tokens: (this.currentUser.tokens || 0) + 10 // Bonus for level up
                });
            } else {
                // Just regular reward (1 token per post)
                await pb.collection('users').update(this.currentUser.id, {
                    tokens: (this.currentUser.tokens || 0) + 1
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
        try { await pb.collection('users').requestPasswordReset(email); return { success: true }; }
        catch (err) { return { success: false }; }
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
    }
};

window.store = store;
export { store };
