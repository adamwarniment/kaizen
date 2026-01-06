const API_URL = 'http://127.0.0.1:3001';
let token = '';
let userId = '';
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
        console.log('--- Starting Verification (UI Split) ---');

        // 1. Signup
        console.log('1. Creating User...');
        const email = `test.split.${Date.now()}@example.com`;
        const signup = await api('/auth/signup', 'POST', {
            email, password: 'password', name: 'Split Test User'
        });
        token = signup.token;
        userId = signup.user.id;
        console.log('   User created:', email);

        // 2. Create Measure (Simple, no goals)
        console.log('2. Creating Measure "Reading" (pages)...');
        const measure = await api('/measures', 'POST', {
            name: 'Reading',
            unit: 'pages' // No goals passed here
        }, token);
        if (measure.goals && measure.goals.length > 0) throw new Error('Measure should have 0 goals initially');
        measureId = measure.id;
        console.log('   Measure created:', measureId);

        // 3. Create Goal (Decoupled)
        console.log('3. Creating Goal for Reading...');
        const goal = await api('/goals', 'POST', {
            measureId,
            timeframe: 'DAILY',
            type: 'TOTAL',
            targetValue: 10,
            rewardAmount: 1
        }, token);
        console.log('   Goal created:', goal.id, goal.timeframe, goal.type);

        // 4. List Goals
        console.log('4. Listing Goals...');
        const goals = await api('/goals', 'GET', null, token);
        console.log('   Goals found:', goals.length);
        if (goals.length !== 1) throw new Error('Expected 1 goal');
        if (goals[0].measureId !== measureId) throw new Error('Goal not linked to measure');

        console.log('--- Verification Success! ---');

    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
};

run();
