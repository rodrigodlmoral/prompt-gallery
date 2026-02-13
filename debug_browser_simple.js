(async () => {
    console.clear();
    console.log("🐛 DEBUGGING FILTERS 🐛");

    const pb = window.pb || (window.stores && window.stores.pb);
    if (!pb) return console.error("❌ No PB found");

    const uid = pb.authStore.model?.id;
    console.log("UID:", uid);

    // Test 1: Standard (Current code)
    console.group("Test 1: With Spaces");
    try {
        const f1 = `from_user = "${uid}" || to_user = "${uid}"`;
        console.log("Filter:", f1);
        await pb.collection('ledger').getList(1, 1, { filter: f1 });
        console.log("✅ SUCCESS");
    } catch (e) { console.error("❌ FAIL:", e.status, e.message); }
    console.groupEnd();

    // Test 2: Compact
    console.group("Test 2: No Spaces");
    try {
        const f2 = `from_user="${uid}"||to_user="${uid}"`;
        console.log("Filter:", f2);
        await pb.collection('ledger').getList(1, 1, { filter: f2 });
        console.log("✅ SUCCESS");
    } catch (e) { console.error("❌ FAIL:", e.status, e.message); }
    console.groupEnd();

    // Test 3: Single Quotes
    console.group("Test 3: Single Quotes");
    try {
        const f3 = `from_user='${uid}' || to_user='${uid}'`;
        console.log("Filter:", f3);
        await pb.collection('ledger').getList(1, 1, { filter: f3 });
        console.log("✅ SUCCESS");
    } catch (e) { console.error("❌ FAIL:", e.status, e.message); }
    console.groupEnd();

})();
