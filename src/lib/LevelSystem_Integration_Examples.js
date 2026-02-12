// ═══════════════════════════════════════════════════════════
// LEVEL SYSTEM - INTEGRATION EXAMPLES (V3)
// ═══════════════════════════════════════════════════════════
// These code snippets show how to integrate level checks into UI actions

// EXAMPLE 1: Comment Button (Level 1+ Required)
// In DetailModal.js or wherever comments are posted
async function handleComment() {
    const levelCheck = store.checkLevelFeature('comment');

    if (!levelCheck.hasAccess) {
        window.showToast(levelCheck.message, 'warning');
        return;
    }

    // Proceed with commenting...
    const result = await store.addComment(promptId, commentText);
    // ...
}

// EXAMPLE 2: Favorite/Save Button (Level 1+ Required)
// In DetailModal.js or Gallery.js
async function handleSaveFavorite() {
    const levelCheck = store.checkLevelFeature('favorite');

    if (!levelCheck.hasAccess) {
        window.showToast(levelCheck.message, 'warning');
        return;
    }

    // Proceed with saving...
    const result = await store.toggleFavorite(promptId);
    // ...
}

// EXAMPLE 3: Transfer Tokens (Level 1+ Required)
// In TipModal.js or TransferModal.js
async function handleTransfer() {
    const levelCheck = store.checkLevelFeature('transfer');

    if (!levelCheck.hasAccess) {
        window.showToast(levelCheck.message, 'warning');
        return;
    }

    // Proceed with transfer...
    const result = await store.sendTip(userId, amount);
    // ...
}

// EXAMPLE 4: Avatar Upload (Level 2+ Required)
// In SettingsModal.js
async function handleAvatarUpload() {
    const levelCheck = store.checkLevelFeature('avatar');

    if (!levelCheck.hasAccess) {
        window.showToast(levelCheck.message, 'warning');
        return;
    }

    // Proceed with upload...
    const result = await store.uploadAvatar(file);
    // ...
}

// EXAMPLE 5: Sequence Publishing (Level 2+ Required)
// In CreateModal.js
function onTypeChange(newType) {
    if (newType === 'sequence') {
        const levelCheck = store.checkLevelFeature('sequence');

        if (!levelCheck.hasAccess) {
            window.showToast(levelCheck.message, 'warning');
            // Revert to 'single' type
            typeSelect.value = 'single';
            return;
        }
    }

    // Proceed with type change...
    currentType = newType;
    // ...
}

// EXAMPLE 6: Daily Post Limit (Already integrated in store.addPrompt())
// This is shown for reference - the check happens automatically
async function publishPrompt(data) {
    const result = await store.addPrompt(data);

    if (!result.success) {
        // This will show the daily limit message if exceeded
        window.showToast(result.msg, 'error');
        return;
    }

    // Success - prompt published
    if (result.leveledUp) {
        window.showToast(`🎉 ¡Subiste a Nivel ${result.newLevel}: ${result.levelName}! +${result.tokensEarned} 💎`, 'success');
    }
}

// EXAMPLE 7: UI State - Disable buttons based on level
// In any component that needs to show/hide features
function updateUIBasedOnLevel() {
    const user = store.currentUser;
    if (!user) return;

    const userLevel = user.level || 0;

    // Disable comment button if Level 0
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
        if (userLevel < 1) {
            commentBtn.disabled = true;
            commentBtn.title = 'Nivel 1 requerido para comentar';
            commentBtn.style.opacity = '0.5';
        }
    }

    // Hide avatar upload if Level 0-1
    const avatarUpload = document.getElementById('avatarUpload');
    if (avatarUpload) {
        if (userLevel < 2) {
            avatarUpload.style.display = 'none';
        }
    }

    // Show sequence option only for Level 2+
    const sequenceOption = document.querySelector('option[value="sequence"]');
    if (sequenceOption) {
        if (userLevel < 2) {
            sequenceOption.disabled = true;
            sequenceOption.textContent += ' (Nivel 2+)';
        }
    }
}
