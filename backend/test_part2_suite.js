const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function runPart2Tests() {
  console.log('--- STARTING PART 2 QA AUTH & GUJARAT LOCATION SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(testName, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${detail}`);
      failed++;
    }
  }

  const testEmail = `gujarat_user_${Date.now()}@mediguide.in`;
  const testMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  try {
    // 1. Missing required fields
    const missingRes = await request('POST', '/api/auth/register', { name: 'Test' });
    assert('Registration rejects missing required fields (400)', missingRes.status === 400);

    // 2. Invalid mobile number validation
    const badMobileRes = await request('POST', '/api/auth/register', {
      name: 'Bad Mobile User',
      email: `bad_${Date.now()}@test.com`,
      mobile: '12345',
      password: 'Password123!',
    });
    assert('Registration rejects non-10-digit mobile number', badMobileRes.status === 400);

    // 3. New User Registration with complete Gujarat administrative location
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Dr. Aarav Patel',
      email: testEmail,
      mobile: testMobile,
      password: 'SecurePassword123!',
      location: {
        country: 'India',
        state: 'Gujarat',
        district: 'Devbhumi Dwarka',
        city: 'Dwarka',
        taluka: 'Dwarka',
        villageArea: 'Shivrajpur Beach',
        latitude: 22.2442,
        longitude: 68.9685,
      },
    });

    assert(
      'New user registers with full Gujarat location hierarchy & returns JWT',
      regRes.status === 201 &&
        regRes.body.token &&
        regRes.body.user.location.district === 'Devbhumi Dwarka' &&
        regRes.body.user.location.city === 'Dwarka'
    );

    const token = regRes.body.token;

    // 4. Existing Email Registration Check
    const dupRes = await request('POST', '/api/auth/register', {
      name: 'Duplicate User',
      email: testEmail,
      password: 'Password123!',
    });
    assert('Registration rejects duplicate email with 400', dupRes.status === 400);

    // 5. Login with Email
    const loginEmailRes = await request('POST', '/api/auth/login', {
      identifier: testEmail,
      password: 'SecurePassword123!',
    });
    assert(
      'Login with email restores user session and location',
      loginEmailRes.status === 200 &&
        loginEmailRes.body.token &&
        loginEmailRes.body.user.location.city === 'Dwarka'
    );

    // 6. Login with Mobile Number
    const loginMobileRes = await request('POST', '/api/auth/login', {
      identifier: testMobile,
      password: 'SecurePassword123!',
    });
    assert(
      'Login with 10-digit mobile number succeeds',
      loginMobileRes.status === 200 && loginMobileRes.body.token
    );

    // 7. Login with Incorrect Password
    const badPassRes = await request('POST', '/api/auth/login', {
      identifier: testEmail,
      password: 'WrongPassword!',
    });
    assert('Login with wrong password returns 401 Unauthorized', badPassRes.status === 401);

    // 8. Protected Profile Endpoint returns saved Gujarat location
    const meRes = await request('GET', '/api/auth/me', null, token);
    assert(
      'GET /api/auth/me returns saved Gujarat district and taluka',
      meRes.status === 200 && meRes.body.user.location.state === 'Gujarat'
    );

    // 9. Update location endpoint for logged-in user
    const updateLocRes = await request('PUT', '/api/auth/location', {
      district: 'Ahmedabad',
      city: 'Sanand',
      taluka: 'Sanand',
      villageArea: 'Sanand GIDC',
    }, token);
    assert(
      'PUT /api/auth/location updates user location successfully',
      updateLocRes.status === 200 && updateLocRes.body.location.city === 'Sanand'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n=== QA PART 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runPart2Tests();

