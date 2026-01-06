const API_URL = 'http://127.0.0.1:3001';
let token = '';

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
        console.log('--- Starting Verification (Manual Transactions) ---');

        // 1. Signup
        console.log('1. Creating User...');
        const email = `test.tx.${Date.now()}@example.com`;
        const signup = await api('/auth/signup', 'POST', {
            email, password: 'password', name: 'Tx Test User'
        });
        token = signup.token;
        console.log('   User created:', email);

        // 2. Manual Credit
        console.log('2. Adding Manual Credit ($100)...');
        const credit = await api('/transactions', 'POST', {
            type: 'CREDIT', amount: 100, description: 'Found cash'
        }, token);
        console.log('   New Balance:', credit.newBalance);
        if (credit.newBalance !== 100) throw new Error('Balance incorrect after credit');

        // 3. Manual Debit
        console.log('3. Adding Manual Debit ($40)...');
        const debit = await api('/transactions', 'POST', {
            type: 'DEBIT', amount: 40, description: 'Grocery'
        }, token);
        console.log('   New Balance:', debit.newBalance);
        if (debit.newBalance !== 60) throw new Error('Balance incorrect after debit');

        // 4. Insufficient Funds Test
        console.log('4. Testing Insufficient Funds ($1000)...');
        try {
            await api('/transactions', 'POST', {
                type: 'DEBIT', amount: 1000, description: 'Ferrari'
            }, token);
            throw new Error('Should have failed with insufficient funds');
        } catch (e) {
            console.log('   Correctly failed:', e.message);
        }

        // 5. Verify History
        console.log('5. Verifying Transaction History...');
        const history = await api('/transactions', 'GET', null, token);
        console.log(`   Found ${history.length} transactions.`);
        console.log('   Tx 0:', history[0]);
        console.log('   Tx 1:', history[1]);
        if (history.length !== 2) throw new Error('Incorrect transaction count');
        if (history[0].amount !== -40) throw new Error('Latest transaction should be debit');

        console.log('--- Verification Success! ---');

    } catch (e) {
        console.error('FAILED:', e.message);
        process.exit(1);
    }
};

run();
