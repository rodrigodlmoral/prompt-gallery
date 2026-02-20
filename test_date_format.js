
function formatFullDateTime(dateStr) {
    if (!dateStr) return 'empty';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'invalid';

    try {
        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace('.', '');
    } catch (e) {
        return date.toISOString();
    }
}

console.log("Test 1:", formatFullDateTime("2026-02-17 00:36:00.000Z"));
console.log("Test 2:", formatFullDateTime(new Date().toISOString()));
