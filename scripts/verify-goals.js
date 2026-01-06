const axios = require('axios');

const API_URL = 'http://localhost:3001';
let token = '';
let userId = '';
let measureId = '';

const run = async () => {
    try {
        console.log('--- Starting Verification ---');

        // 1. Signup
        console.log('1. Creating User...');
        const email = `test.${Date.now()}@example.com`;
        const signup = await axios.post(`${API_URL}/auth/signup`, {
            email, password: 'password', name: 'Test User'
        });
        token = signup.data.token;
        userId = signup.data.user.id;
        console.log('   User created:', email);

        // 2. Create Measure with Daily and Weekly Goals
        console.log('2. Creating Measure (Workout)...');
        const measureRes = await axios.post(`${API_URL}/measures`, {
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
                    targetValue: 3, // Testing with 3 instead of 5 for shorter test
                    minPerEntry: 30,
                    rewardAmount: 10 // $10 bonus for 3x30mins
                }
            ]
        }, { headers: { Authorization: `Bearer ${token}` } });
        measureId = measureRes.data.id;
        console.log('   Measure created with goals:', measureRes.data.goals.length);

        // 3. Log Entries to trigger Daily Goal
        console.log('3. Logging Day 1: 30 mins...');
        const d1 = new Date(); // Today
        const res1 = await axios.post(`${API_URL}/entries`, {
            measureId,
            value: 30,
            date: d1.toISOString()
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log('   Day 1 Result:', res1.data.totalReward);
        if (res1.data.totalReward !== 5) throw new Error('Expected $5 daily reward');

        // 4. Log more entries to trigger Weekly Goal
        // We need different dates for the "count" logic if we were strict, but my current implementation 
        // using "count" matches entries. Ideally distinct days, but let's see. 
        // My implementation checks `entries.filter(...)`. It doesn't enforce "distinct days" yet, 
        // just "number of entries". This is per user request "5 workouts a week", which could be 2 in one day.

        console.log('4. Logging Day 2: 30 mins...');
        const d2 = new Date(); d2.setDate(d2.getDate() + 1);
        await axios.post(`${API_URL}/entries`, {
            measureId, value: 30, date: d2.toISOString()
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log('5. Logging Day 3: 30 mins (Should trigger Weekly Bonus)...');
        const d3 = new Date(); d3.setDate(d3.getDate() + 2);
        const res3 = await axios.post(`${API_URL}/entries`, {
            measureId, value: 30, date: d3.toISOString()
        }, { headers: { Authorization: `Bearer ${token}` } });

        console.log('   Day 3 Total Reward:', res3.data.totalReward);
        // Should be $5 (daily) + $10 (weekly) = $15
        if (res3.data.totalReward !== 15) throw new Error(`Expected $15 ($5 daily + $10 weekly), got $${res3.data.totalReward}`);

        console.log('--- Verification Success! ---');

    } catch (e) {
        console.error('FAILED:', e.message);
        if (e.response) console.error('Response:', e.response.data);
        process.exit(1);
    }
};

run();
