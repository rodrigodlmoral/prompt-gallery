import PocketBase from 'pocketbase';

const pb = new PocketBase('https://prompt-gallery.pockethost.io');

async function setup() {
    try {
        console.log("Authenticating as admin...");
        await pb.admins.authWithPassword('rodridom.rock@gmail.com', 'alcaline01#pock');
        console.log("Authenticated successfully.");

        console.log("Creating referrals collection...");
        try {
            await pb.collections.create({
                name: 'referrals',
                type: 'base',
                schema: [
                    {
                        name: 'referrer',
                        type: 'relation',
                        required: true,
                        options: {
                            collectionId: '_pb_users_auth_',
                            cascadeDelete: false,
                            minSelect: null,
                            maxSelect: 1,
                            displayFields: []
                        }
                    },
                    {
                        name: 'referred',
                        type: 'relation',
                        required: true,
                        options: {
                            collectionId: '_pb_users_auth_',
                            cascadeDelete: false,
                            minSelect: null,
                            maxSelect: 1,
                            displayFields: []
                        }
                    },
                    {
                        name: 'code',
                        type: 'text',
                        required: true
                    },
                    {
                        name: 'is_active',
                        type: 'bool'
                    },
                    {
                        name: 'registered_at',
                        type: 'date',
                        required: true
                    },
                    {
                        name: 'activated_at',
                        type: 'date'
                    }
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: null,
                deleteRule: null
            });
            console.log("✅ Referrals collection created.");
        } catch (e) {
            console.log("⚠️ Referrals collection creation issue (might already exist):", e.response ? e.response.data : e.message);
        }

        console.log("Updating users collection...");
        try {
            const usersCollection = await pb.collections.getOne('users');

            const hasReferralCode = usersCollection.fields.some(f => f.name === 'referral_code');
            const hasActiveReferralsCount = usersCollection.fields.some(f => f.name === 'active_referrals_count');

            if (!hasReferralCode) {
                usersCollection.fields.push({
                    name: 'referral_code',
                    type: 'text',
                    options: { min: null, max: null, pattern: '' }
                });
            }
            if (!hasActiveReferralsCount) {
                usersCollection.fields.push({
                    name: 'active_referrals_count',
                    type: 'number',
                    options: { min: 0, max: null }
                });
            }

            if (!hasReferralCode || !hasActiveReferralsCount) {
                await pb.collections.update('users', usersCollection);
                console.log("✅ Users collection updated.");
            } else {
                console.log("✅ Users collection already has the new fields.");
            }

        } catch (e) {
            console.error("❌ Error updating users collection:", e.response ? e.response.data : e.message);
        }

        console.log("🏁 Done.");
    } catch (err) {
        console.error("❌ Fatal error:", err.response ? err.response.data : err.message);
    }
}

setup();
