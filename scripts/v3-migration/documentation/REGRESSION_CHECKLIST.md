
# ✅ V3 Migration Regression Checklist

This checklist defines the critical functionalities that MUST remain operational after the V3 Ledger & Level System migration.

## 1. User Registration & Onboarding
- [ ] **New Account Creation**: Can a user register with email/pass?
- [ ] **Welcome Bonus**: Does the new user receive the correct initial balance (e.g., 50 PB or new value)?
    -   *V3 Check*: Verify transaction created in `ledger`.
- [ ] **Data Integrity**: Are default fields set correctly (`level: 0`, `role: user`, `moderation: BLUR`)?
- [ ] **Auto-Follow**: Does the user automatically follow the Admin account?

## 2. Content Creation (Posting)
- [ ] **Upload**: Can user upload an image?
- [ ] **Post Creation**: Is the `prompts` record created successfully?
- [ ] **Token Deduction (Optional)**: If posting costs tokens in V3, is the balance deducted correctly?
    -   *V3 Check*: Verify `ledger` transaction type 'POST_FEE'.
- [ ] **Reward**: Does the user receive the correct reward (XP/Tokens)?
    -   *V3 Check*: Verify `ledger` transaction type 'POST_REWARD'.
- [ ] **Level Check**: Does the system recalculate the user level correctly after posting?

## 3. Prompt Interaction
- [ ] **Copy Prompt**: Does clicking "Copy" copy the text to clipboard?
- [ ] **Copy Count**: Does the `copy_count` increment on the prompt?
- [ ] **User Stats**: Do the user's `total_copies` stats update correctly?

## 4. Profile & Stats
- [ ] **Profile Load**: Does the profile load without errors (no undefined fields)?
- [ ] **Token Balance**: Is the displayed token balance accurate (synced with `ledger`)?
- [ ] **Level Display**: Is the correct level badge shown?
- [ ] **Gallery**: Does the user's gallery load all their prompts?

## 5. Admin Functions
- [ ] **Dashboard Access**: Can Admin access special menus?
- [ ] **User Management**: Can Admin edit/delete users?
- [ ] **Ticket System**: Can support tickets be created/viewed?
