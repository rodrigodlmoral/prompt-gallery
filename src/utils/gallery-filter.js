export const filterPrompts = ({
    prompts,
    currentUser,
    currentView,
    profileUser,
    profileTab,
    filters,
    searchQuery
}) => {
    let list = Array.isArray(prompts) ? [...prompts] : [];

    // 1. Scope Filtering (Profile vs Feed)
    if (currentUser) {
        const hidden = currentUser.hiddenPrompts || [];
        const blocked = currentUser.blockedUsers || [];
        list = list.filter(p => !hidden.includes(p.id) && !blocked.includes(p.author));
    }

    if (currentView === 'profile') {
        // En perfil, el filtro 'user' es implícito o forzado
        list = list.filter(p => {
            // UNIFICACIÓN DE PRIVACIDAD: is_private es la clave oficial
            const isPrivate = p.is_private === true || p.isPrivate === true;
            if (isPrivate) {
                // Solo el autor puede ver sus propios posts privados
                if (!currentUser || currentUser.id !== p.author_id) return false;
            }
            return profileTab === 'creations' ? p.author_id === profileUser : p.savedBy?.includes(profileUser);
        });
    } else {
        // En el Dashboard público, ocultar TODO lo privado de raíz
        list = list.filter(p => !(p.is_private === true || p.isPrivate === true));
        if (filters.source === 'following' && currentUser) {
            const myFollowing = currentUser.following || [];
            list = list.filter(p => myFollowing.includes(p.author_id));
        } else if (filters.source === 'user' && currentUser) {
            // "Tus Prompts" en Home (librería propia)
            list = list.filter(p => p.author === currentUser.username);
        }
    }

    // 2. Search Query
    if (searchQuery) {
        const term = searchQuery.toLowerCase();
        list = list.filter(p => {
            const inTitle = p.title?.toLowerCase().includes(term);
            const inTags = (p.tags || []).some(t => t.toLowerCase().includes(term));
            return inTitle || inTags;
        });
    }

    // 3. Filters
    if (filters.time !== 'all') {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        list = list.filter(p => {
            const age = now - p.createdAt;
            if (filters.time === 'today') return age < oneDay;
            if (filters.time === 'week') return age < oneDay * 7;
            if (filters.time === 'month') return age < oneDay * 30;
            return true;
        });
    }

    if (filters.tools.length > 0) {
        list = list.filter(p => filters.tools.includes(p.tool));
    }

    if (filters.refFilter !== 'all') {
        if (filters.refFilter === 'withRef') list = list.filter(p => p.needsReference);
        if (filters.refFilter === 'noRef') list = list.filter(p => !p.needsReference);
    }

    if (filters.ratings.length > 0) {
        list = list.filter(p => {
            const r = p.type === 'sequence' && p.content && p.content.length > 0 ? p.content[0].rating : p.rating;
            return filters.ratings.includes(r);
        });
    }

    if (filters.tags.length > 0) {
        list = list.filter(p => (p.tags || []).some(t => filters.tags.includes(t)));
    }

    // 4. Sorting
    if (filters.sort === 'newest') list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (filters.sort === 'oldest') list.sort((a, b) => (a.createdAt || Infinity) - (b.createdAt || Infinity));
    if (filters.sort === 'popular') {
        list.sort((a, b) => {
            const reaA = Object.values(a.reactions || {}).reduce((x, y) => x + y, 0);
            const reaB = Object.values(b.reactions || {}).reduce((x, y) => x + y, 0);
            return reaB - reaA; // Descending
        });
    }
    if (filters.sort === 'commented') {
        list.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    }

    // 5. Guest User Restriction (Non-Registered)
    if (!currentUser) {
        list = list.slice(0, 12);
    }

    return list;
};
