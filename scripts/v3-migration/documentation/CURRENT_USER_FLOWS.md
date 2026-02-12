
# 🕵️ Current User Flows Documentation (Pre-V3)

This document maps the critical user flows as they exist in version v4.1, before the V3 Ledger/Level migration.

## 1. Registration (`store.register`)
**File:** `src/store-final.js` (Lines ~1092)
**Trigger:** `AuthModal.js` -> `doRegisterSubmit`

**Process:**
1.  **Create User:**
    -   **Tokens:** 100 (Welcome Bonus)
    -   **Level:** 0
    -   **XP:** 0
    -   **Role:** 'user'
    -   **Moderation:** `{ suggestive: 'BLUR', nsfw: 'BLUR' }`
2.  **Verification:** Sends verification email.
3.  **Auto-Follow:** Automatically follows the Admin ID (`rkmrhmgh067x7un`).

## 2. Content Creation (`store.addPrompt`)
**File:** `src/store-final.js` (Lines ~481)
**Trigger:** `CreateModal.js`

**Process:**
1.  **Upload:** Uploads images to Cloudinary.
2.  **Create Record:** Creates `prompts` record with `created_at_custom` timestamp.
3.  **Level Logic:**
    -   Calculates **Total Posts** & **Total Copies** for the user.
    -   Checks against `LEVEL_REQS` array.
    -   **Reward:**
        -   **+10 Tokens** if Level Up occurs.
        -   **+1 Token** standard reward otherwise.
    -   **Update User:** Updates `level`, `prompts_count`, `total_copies`, and `tokens` in `users` collection.

## 3. Prompt Copying (`window.doCopyPrompt`)
**File:** `src/components/DetailModal.js` & `store-final.js`
**Trigger:** "Copiar Prompt" button in Detail Modal.

**Process:**
1.  **Clipboard:** Copies text to device clipboard.
2.  **Backend Update:** Calls `store.incrementCopyCount(id)`.
    -   *Note: This specific function wasn't fully visible in scan but implies a simple atomic increment `copy_count+1`.*
3.  **Feedback:** Shows "Prompt Copiado" toast.

## 4. Stats Sync (`store.syncUserStats`)
**File:** `src/store-final.js`
**Trigger:** Profile Load (`_loadUserProfile`)

**Process:**
1.  **Verification:** Counts actual records in `prompts` collection (filter by author).
2.  **Summation:** Sums `copy_count` of all authored prompts.
3.  **Correction:** If `users.prompts_count` or `users.total_copies` mismatches the calculated actuals, it performs a silent update to the `users` collection to fix the numbers.
