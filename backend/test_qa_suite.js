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

async function runTests() {
  console.log('--- STARTING MEDIGUIDE QA FULL API TEST SUITE ---');
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

  try {
    // 1. Hospital Public APIs
    const hospitalsRes = await request('GET', '/api/hospitals');
    assert('GET /api/hospitals returns 200 and hospital list', hospitalsRes.status === 200 && hospitalsRes.body.count >= 4);

    const firstHospital = hospitalsRes.body.data[0];
    const hospitalDetailRes = await request('GET', `/api/hospitals/${firstHospital._id}`);
    assert('GET /api/hospitals/:id returns hospital details', hospitalDetailRes.status === 200 && hospitalDetailRes.body.data.name.length > 0);

    const statsRes = await request('GET', '/api/hospitals/stats');
    assert('GET /api/hospitals/stats returns 200 with platform metrics', statsRes.status === 200 && !!statsRes.body.data.totalHospitals);

    // Filter test: Search by specialty "Cardiology"
    const cardiologyRes = await request('GET', '/api/hospitals?specialty=Cardiology');
    assert('GET /api/hospitals?specialty=Cardiology filters correctly', cardiologyRes.status === 200 && cardiologyRes.body.count >= 1);

    // 2. Symptom Analysis API (Emergency case & Normal case)
    const emergencySymptom = await request('POST', '/api/symptoms/analyze', {
      symptoms: ['Chest Pain', 'Shortness of breath']
    });
    assert(
      'POST /api/symptoms/analyze detects emergency urgency level',
      emergencySymptom.status === 200 && emergencySymptom.body.data.urgencyLevel === 'Emergency'
    );

    const mildSymptom = await request('POST', '/api/symptoms/analyze', {
      symptoms: ['Sore throat', 'Mild cough']
    });
    assert(
      'POST /api/symptoms/analyze provides general assessment and specialist recommendation',
      mildSymptom.status === 200 && mildSymptom.body.data.possibleConditions.length > 0 && !!mildSymptom.body.data.medicalDisclaimer
    );

    // 3. Auth Tests: Registration, Login, Token validation
    const testEmail = `qa_test_${Date.now()}@mediguide.internal`;
    const regRes = await request('POST', '/api/auth/register', {
      name: 'QA Test User',
      email: testEmail,
      password: 'SecurePassword123!'
    });
    assert('POST /api/auth/register creates user and returns JWT', regRes.status === 201 && !!regRes.body.token);

    const token = regRes.body.token;

    // Test Login
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'SecurePassword123!'
    });
    assert('POST /api/auth/login logs in and returns valid token', loginRes.status === 200 && !!loginRes.body.token);

    // Test Login with wrong password (Security / Validation)
    const badLoginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert('POST /api/auth/login rejects wrong password with 401', badLoginRes.status === 401);

    // Test Protected profile endpoint
    const meRes = await request('GET', '/api/auth/me', null, token);
    assert('GET /api/auth/me returns authenticated user profile', meRes.status === 200 && meRes.body.user.email === testEmail);

    const unauthRes = await request('GET', '/api/auth/me');
    assert('GET /api/auth/me without token returns 401 Unauthorized', unauthRes.status === 401);

    // 4. Favorites API
    const addFavRes = await request('POST', `/api/favorites/${firstHospital._id}`, null, token);
    assert('POST /api/favorites/:id adds hospital to user favorites', addFavRes.status === 200 || addFavRes.status === 201);

    const getFavRes = await request('GET', '/api/favorites', null, token);
    assert('GET /api/favorites returns saved favorites for user', getFavRes.status === 200 && getFavRes.body.count >= 1);

    const delFavRes = await request('DELETE', `/api/favorites/${firstHospital._id}`, null, token);
    assert('DELETE /api/favorites/:id removes hospital from favorites', delFavRes.status === 200);

    const getFavAfterDel = await request('GET', '/api/favorites', null, token);
    assert('Favorites count is 0 after deletion', getFavAfterDel.status === 200 && getFavAfterDel.body.count === 0);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n=== QA BACKEND TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
