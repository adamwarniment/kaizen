const API_URL = 'http://127.0.0.1:3001';
let token = '';
let measureId = '';

const api = async (endpoint, method, body, authToken) => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
};

const run = async () => {
    try {
        console.log('--- Starting Verification (Calendar Logic) ---');

        // 1. Signup
        console.log('1. Creating User...');
        const email = `test.cal.${Date.now()}@example.com`;
        const signup = await api('/auth/signup', 'POST', {
            email, password: 'password', name: 'Cal Test User'
        });
        token = signup.token;
        console.log('   User created:', email);

        // 2. Create Measure
        console.log('2. Creating Measure "Steps"...');
        const measure = await api('/measures', 'POST', {
            name: 'Steps', unit: 'steps'
        }, token);
        measureId = measure.id;

        // 3. Log Entries on different dates
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const lastMonth = new Date(today); lastMonth.setMonth(today.getMonth() - 1);

        console.log(`3. Logging entries on: ${today.toISOString()}, ${yesterday.toISOString()}, ${lastMonth.toISOString()}`);

        await api('/entries', 'POST', { measureId, value: 5000, date: today.toISOString() }, token);
        await api('/entries', 'POST', { measureId, value: 3000, date: yesterday.toISOString() }, token);
        await api('/entries', 'POST', { measureId, value: 10000, date: lastMonth.toISOString() }, token);

        // 4. Query Range (Yesterday to Today)
        console.log('4. Querying Date Range (Yesterday -> Today)...');
        // Start of yesterday to end of today
        const start = new Date(yesterday); start.setHours(0, 0, 0, 0);
        const end = new Date(today); end.setHours(23, 59, 59, 999);

        const entries = await api(`/entries?start=${start.toISOString()}&end=${end.toISOString()}`, 'GET', null, token);

        console.log(`   Found ${entries.length} entries. Expected: 2`);
        if (entries.length !== 2) throw new Error('Incorrect number of entries found for range');

        // Verify values
        const values = entries.map(e => e.value).sort();
        if (values[0] !== 3000 || values[1] !== 5000) throw new Error('Incorrect entry values found');

        console.log('--- Verification Success! ---');

    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
};

run();
