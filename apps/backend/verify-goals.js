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
        console.log('--- Starting Verification (Fetch) ---');

        // 1. Signup
        console.log('1. Creating User...');
        const email = `test.${Date.now()}@example.com`;
        const signup = await api('/auth/signup', 'POST', {
            email, password: 'password', name: 'Test User'
        });
        token = signup.token;
        userId = signup.user.id;
        console.log('   User created:', email);

        // 2. Create Measure with Daily and Weekly Goals
        console.log('2. Creating Measure (Workout)...');
        const measure = await api('/measures', 'POST', {
            name: 'Workout',
            unit: 'minutes',
            goals: [
                {
                    timeframe: 'DAILY',
                    type: 'TOTAL',
                    targetValue: 30,
                    rewardAmount: 5 // $5 for 30 mins daily
                },
                {
                    timeframe: 'WEEKLY',
                    type: 'COUNT',
                    targetValue: 3, // Testing with 3
                    minPerEntry: 30,
                    rewardAmount: 10 // $10 bonus
                }
            ]
        }, token);
        measureId = measure.id;
        console.log('   Measure created with goals');

        // 3. Log Entries
        console.log('3. Logging Day 1: 30 mins...');
        const d1 = new Date();
        const res1 = await api('/entries', 'POST', {
            measureId, value: 30, date: d1.toISOString()
        }, token);
        console.log('   Day 1 Reward:', res1.totalReward);
        if (res1.totalReward !== 5) throw new Error('Expected $5 daily reward');

        console.log('4. Logging Day 2: 30 mins...');
        const d2 = new Date(); d2.setDate(d2.getDate() + 1);
        await api('/entries', 'POST', {
            measureId, value: 30, date: d2.toISOString()
        }, token);

        console.log('5. Logging Day 3: 30 mins (Should trigger Weekly Bonus)...');
        const d3 = new Date(); d3.setDate(d3.getDate() + 2);
        const res3 = await api('/entries', 'POST', {
            measureId, value: 30, date: d3.toISOString()
        }, token);

        console.log('   Day 3 Total Reward:', res3.totalReward);
        // Expect $5 (daily) + $10 (weekly) = $15
        if (res3.totalReward !== 15) throw new Error(`Expected $15, got $${res3.totalReward}`);

        console.log('--- Verification Success! ---');
    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
};

run();
