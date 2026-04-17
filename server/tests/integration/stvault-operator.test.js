/**
 * stVault Operator / PDG API integration tests.
 *
 * These are internal-only endpoints (InternalApiView) that require
 * IP whitelist or internal service token, not JWT auth.
 * Tests validate param checking and schema; actual contract calls
 * are avoided to prevent side-effects.
 */
const {
  api,
  VAULT_ADDRESS,
  expectEnvelope,
  expectError,
} = require('./helpers');

/**
 * Internal token for operator endpoints.
 * Set via STVAULT_INTERNAL_TOKEN env var.
 */
const INTERNAL_TOKEN = process.env.STVAULT_INTERNAL_TOKEN || '';

function internalHeaders() {
  if (!INTERNAL_TOKEN) return {};
  return { 'X-Internal-Token': INTERNAL_TOKEN };
}

const describeInternal = INTERNAL_TOKEN ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Param validation (these should work regardless of access control)
// ---------------------------------------------------------------------------
describe('Operator API param validation', () => {
  const endpoints = [
    { path: '/v2/stvault/operator/guarantor', params: ['from_address', 'guarantor'] },
    { path: '/v2/stvault/operator/depositor', params: ['from_address', 'depositor'] },
    { path: '/v2/stvault/operator/guarantee', params: ['from_address', 'node_operator', 'amount'] },
    { path: '/v2/stvault/operator/predeposit', params: ['from_address', 'vault', 'deposits'] },
    { path: '/v2/stvault/operator/proveandtopup', params: ['from_address', 'indexes', 'amounts'] },
    { path: '/v2/stvault/operator/topup', params: ['from_address', 'topups'] },
    { path: '/v2/stvault/operator/withdraw', params: ['from_address', 'node_operator', 'amount', 'recipient'] },
    { path: '/v2/stvault/operator/validator/exit', params: ['from_address', 'vault', 'pubkey'] },
  ];

  test.each(endpoints)(
    'POST $path returns error envelope with empty body',
    async ({ path }) => {
      const res = await api
        .post(path)
        .set(internalHeaders())
        .send({});

      expect(res.headers['content-type']).toMatch(/json/);
      // Server may return HTTP 200, 401, or 403 depending on access control
      expect([200, 401, 403]).toContain(res.status);
      expectEnvelope(res.body);
      expect(res.body.success).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// With internal access — deeper validation
// ---------------------------------------------------------------------------
describeInternal('Operator API with internal access', () => {
  describe('POST /v2/stvault/operator/guarantor', () => {
    it('returns 400 for missing params', async () => {
      const res = await api
        .post('/v2/stvault/operator/guarantor')
        .set(internalHeaders())
        .send({ from_address: '0x0000000000000000000000000000000000000001' })
        .expect(200);

      expectError(res.body, 400);
    });
  });

  describe('POST /v2/stvault/operator/depositor', () => {
    it('returns 400 for missing params', async () => {
      const res = await api
        .post('/v2/stvault/operator/depositor')
        .set(internalHeaders())
        .send({ from_address: '0x0000000000000000000000000000000000000001' })
        .expect(200);

      expectError(res.body, 400);
    });
  });

  describe('POST /v2/stvault/operator/predeposit', () => {
    it('returns 400 for non-existent vault', async () => {
      const res = await api
        .post('/v2/stvault/operator/predeposit')
        .set(internalHeaders())
        .send({
          from_address: '0x0000000000000000000000000000000000000001',
          vault: '0x0000000000000000000000000000000000000000',
          deposits: [],
        })
        .expect(200);

      expectError(res.body, 400);
    });
  });

  describe('POST /v2/stvault/operator/validator/exit', () => {
    it('returns 400 for non-existent vault', async () => {
      const res = await api
        .post('/v2/stvault/operator/validator/exit')
        .set(internalHeaders())
        .send({
          from_address: '0x0000000000000000000000000000000000000001',
          vault: '0x0000000000000000000000000000000000000000',
          pubkey: '0x' + '00'.repeat(48),
        })
        .expect(200);

      expectError(res.body, 400);
    });
  });
});
