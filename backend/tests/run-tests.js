const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');

const app = require('../src/app');
const { initializeDataModel } = require('../src/bootstrap/initializeDataModel');
const pool = require('../src/config/db');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const decodeBase32 = (value) => {
  const normalizedValue = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  const output = [];
  let bits = 0;
  let currentValue = 0;

  for (const character of normalizedValue) {
    const index = BASE32_ALPHABET.indexOf(character);
    currentValue = (currentValue << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((currentValue >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

const createTotpCode = (manualKey) => {
  const secret = decodeBase32(manualKey);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binaryCode % 1_000_000).padStart(6, '0');
};

const tests = [
  {
    name: 'frontend observability accepts runtime error reports',
    async run() {
      const response = await request(app)
        .post('/api/observability/frontend-errors')
        .send({
          component_name: 'SmokeTest',
          message: 'Frontend observability smoke test',
          route_path: '/login',
          severity: 'fatal',
        })
        .expect(202);

      assert.equal(response.body.accepted, true);
      assert.ok(response.body.request_id);
    },
  },
  {
    name: 'development CORS accepts fallback Vite loopback origins',
    async run() {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://127.0.0.1:5174')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5174');
      assert.equal(response.headers['access-control-allow-credentials'], 'true');
    },
  },
  {
    name: 'auth supports MFA enrollment and login challenges',
    async run() {
      const agent = request.agent(app);
      const email = `mfa-test-${crypto.randomUUID()}@flowledger.dev`;
      const password = 'TierOnePass123!';

      const register = await agent.post('/api/auth/register').send({
        name: 'MFA Test User',
        email,
        password,
      });

      assert.equal(register.statusCode, 201);
      assert.ok(register.body.emailVerification?.delivery?.verification_url);

      const tokenMatch = /token=([^&]+)/.exec(register.body.emailVerification.delivery.verification_url);
      assert.ok(tokenMatch?.[1]);

      await request(app)
        .post('/api/auth/email-verification/confirm')
        .send({
          token: decodeURIComponent(tokenMatch[1]),
        })
        .expect(200);

      const setup = await agent.post('/api/auth/mfa/setup').send({}).expect(200);
      assert.ok(setup.body.setup?.manual_key);

      const firstCode = createTotpCode(setup.body.setup.manual_key);
      const confirm = await agent
        .post('/api/auth/mfa/setup/confirm')
        .send({
          code: firstCode,
        })
        .expect(200);

      assert.equal(confirm.body.backup_codes.length, 10);

      await agent.post('/api/auth/logout').send({}).expect(200);

      const login = await agent.post('/api/auth/login').send({
        email,
        password,
      });

      assert.equal(login.statusCode, 202);
      assert.equal(login.body.requires_mfa, true);
      assert.ok(login.body.challenge_token);

      const secondCode = createTotpCode(setup.body.setup.manual_key);
      const mfaLogin = await agent
        .post('/api/auth/login/mfa')
        .send({
          challenge_token: login.body.challenge_token,
          code: secondCode,
        })
        .expect(200);

      assert.equal(mfaLogin.body.user.email, email);

      const status = await agent.get('/api/auth/mfa').expect(200);
      assert.equal(status.body.status.enabled, true);
      assert.equal(status.body.status.recovery_codes_remaining, 10);
    },
  },
  {
    name: 'plus access exposes provider inventory and supports sandbox bank sync and reconciliation',
    async run() {
      const agent = request.agent(app);
      const email = `bank-sync-${crypto.randomUUID()}@flowledger.dev`;
      const password = 'TierOnePass123!';

      const register = await agent.post('/api/auth/register').send({
        name: 'Bank Sync User',
        email,
        password,
      });

      assert.equal(register.statusCode, 201);

      await pool.query(
        `
          UPDATE users
          SET
            current_plan_id = 'premium_monthly',
            subscription_status = 'active'
          WHERE email = $1
        `,
        [email]
      );

      const providers = await agent.get('/api/accounts/bank-providers').expect(200);
      assert.ok(Array.isArray(providers.body.providers));
      assert.equal(providers.body.providers.some((provider) => provider.id === 'sandbox'), true);
      assert.equal(providers.body.providers.some((provider) => provider.id === 'plaid'), true);

      const connection = await agent.post('/api/accounts/bank-connections').send({
        provider: 'sandbox',
        institution_name: 'Northwind Sandbox Bank',
        label: 'Primary sandbox feed',
      });

      assert.equal(connection.statusCode, 201);

      const sync = await agent
        .post(`/api/accounts/bank-connections/${connection.body.connection.id}/sync`)
        .send({})
        .expect(200);

      assert.ok(sync.body.importedCount >= 1);

      const queue = await agent.get('/api/accounts/reconciliation-queue').expect(403);
      assert.equal(queue.body.details.feature, 'reconciliationWorkbench');

      await pool.query(
        `
          UPDATE users
          SET current_plan_id = 'premium_annual'
          WHERE email = $1
        `,
        [email]
      );

      const proQueue = await agent.get('/api/accounts/reconciliation-queue').expect(200);
      assert.ok(proQueue.body.queue.length >= 1);

      const firstTransaction = proQueue.body.queue[0];
      const reconcile = await agent
        .post(`/api/accounts/reconciliation-queue/${firstTransaction.id}/reconcile`)
        .send({})
        .expect(200);

      assert.equal(reconcile.body.message, 'Imported transaction reconciled successfully.');
    },
  },
];

const run = async () => {
  await initializeDataModel();

  for (const currentTest of tests) {
    await currentTest.run();
    console.log(`PASS ${currentTest.name}`);
  }

  console.log(`PASS ${tests.length} backend checks`);
};

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  console.error(error.stack || error);
  process.exit(1);
});
