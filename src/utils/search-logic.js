import { TAG_CATEGORIES } from '../data/tags.js';
import { TAG_ALIASES } from '../data/tagAliases.js';
import { pb } from '../pocketbase.js';

// Helper to deduce avatar URL if missing
const getAvatarUrl = (user) => {
    if (user.avatar) return user.avatar; // already full url?
    // If it's a PB record
    if (user.collectionId && user.id && user.avatar) {
        return pb.files.getUrl(user, user.avatar);
    }
    return null;
};

// Internal helper to get unique users
const getSearchableUsers = (store) => {
    const promptAuthors = store.prompts.map(p => ({
        username: p.author,
        avatar: p.profiles?.avatar_url || (p.expand?.author?.avatar ? pb.files.getUrl(p.expand.author, p.expand.author.avatar) : null)
    }));

    // Normalize Profile fallback (if window.normalizeProfile exists, we assume the caller handles it or we do our best)
    // For specific logic, we'll stick to a simple merge
    const allKnownUsers = [
        ...Object.values(store.usersCache || {}),
        ...(store.nuclearCache?.items || []),
        ...promptAuthors
    ];

    const seenUsernames = new Set();
    return allKnownUsers.filter(u => {
        if (!u || !u.username || seenUsernames.has(u.username)) return false;
        seenUsernames.add(u.username);
        return true;
    });
};

export const getSearchSuggestions = ({ query, store }) => {
    if (!query || query.length === 0) {
        return { users: [], prompts: [], tags: [], contentMatches: [] };
    }

    const term = query.toLowerCase();

    // 1. FILTER USERS (Strict StartsWith)
    const uniqueUsers = getSearchableUsers(store);
    const users = uniqueUsers.filter(u => u.username?.toLowerCase().startsWith(term))
        .sort((a, b) => a.username.localeCompare(b.username))
        .map(u => ({ ...u, avatar: u.avatar || getAvatarUrl(u) })) // Ensure avatar
        .slice(0, 5);

    // 2. FILTER PROMPTS (Strict StartsWith)
    const prompts = store.prompts.filter(p => p.title?.toLowerCase().startsWith(term))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);

    // 3. FILTER TAGS (Strict StartsWith + Aliases)
    const allTags = [];
    Object.values(TAG_CATEGORIES).forEach(tList => allTags.push(...tList));
    const uniqueTags = [...new Set(allTags)];

    // Check if query matches any English alias
    const aliasMatches = Object.entries(TAG_ALIASES)
        .filter(([eng, esp]) => eng.toLowerCase().includes(term))
        .flatMap(([eng, esp]) => esp);

    const tags = uniqueTags.filter(t => t.toLowerCase().includes(term) || aliasMatches.includes(t))
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 8);

    // 4. FILTER CONTENT (Matches within the prompt body)
    const contentMatches = store.prompts
        .filter(p => {
            const body = (p.prompt || '').toLowerCase();
            return body.includes(term);
        })
        .map(p => {
            const body = p.prompt || '';
            const lowerBody = body.toLowerCase();
            const idx = lowerBody.indexOf(term);

            // Extract snippet
            const start = Math.max(0, idx - 25);
            const end = Math.min(body.length, idx + term.length + 35);
            let snippet = body.substring(start, end);

            // Basic Escape to prevent breaking UI
            snippet = snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            return { ...p, matchSnippet: snippet };
        })
        .slice(0, 5);

    return { users, prompts, tags, contentMatches };
};
