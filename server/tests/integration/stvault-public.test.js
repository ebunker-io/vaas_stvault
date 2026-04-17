/**
 * stVault Public API integration tests.
 *
 * These endpoints do NOT require authentication and can be tested
 * against any running instance without credentials.
 */
const {
  api,
  VAULT_ADDRESS,
  expectEnvelope,
  expectSuccess,
  expectError,
} = require('./helpers');

// ---------------------------------------------------------------------------
// GET /v2/stvault/statistics
// ---------------------------------------------------------------------------
describe('GET /v2/stvault/statistics', () => {
  it('returns a success envelope with latest statistics', async () => {
    const res = await api
      .get('/v2/stvault/statistics')
      .expect('Content-Type', /json/)
      .expect(200);

    expectSuccess(res.body);
    // data may be {} when no statistics exist yet — still valid
    expect(typeof res.body.data).toBe('object');
  });

  it('returns statistics for a specific date', async () => {
    const res = await api
      .get('/v2/stvault/statistics')
      .query({ date: '2025-01-01' })
      .expect('Content-Type', /json/)
      .expect(200);

    expectSuccess(res.body);
  });

  it('rejects an invalid date format', async () => {
    const res = await api
      .get('/v2/stvault/statistics')
      .query({ date: 'not-a-date' })
      .expect('Content-Type', /json/);

    expect([200, 400]).toContain(res.status);
    expectError(res.body, 400);
  });

  it('data contains expected numeric fields when present', async () => {
    const res = await api
      .get('/v2/stvault/statistics')
      .expect(200);

    const { data } = res.body;
    if (data && Object.keys(data).length > 0) {
      // When statistics exist, these integer fields must be present
      expect(typeof data.total_eth).toBe('number');
      expect(data.total_eth).toBeGreaterThanOrEqual(0);
      expect(typeof data.total_unstaked_eth).toBe('number');
      expect(data.total_unstaked_eth).toBeGreaterThanOrEqual(0);
      // Invariant: unstaked <= total
      expect(data.total_unstaked_eth).toBeLessThanOrEqual(data.total_eth);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/metrics  (public, but requires a valid vault param)
// ---------------------------------------------------------------------------
describe('GET /v2/stvault/metrics', () => {
  it('returns 400 when vault param is missing', async () => {
    const res = await api
      .get('/v2/stvault/metrics')
      .expect('Content-Type', /json/);

    expect([200, 400]).toContain(res.status);
    expectError(res.body, 400);
  });

  it('returns 400 for a non-existent vault', async () => {
    const res = await api
      .get('/v2/stvault/metrics')
      .query({ vault: '0x0000000000000000000000000000000000000000' })
      .expect('Content-Type', /json/);

    expect([200, 400]).toContain(res.status);
    expectError(res.body, 400);
  });

  // Conditional: only runs if a real vault address is configured
  const describeWithVault = VAULT_ADDRESS ? describe : describe.skip;

  describeWithVault('with a real vault address', () => {
    it('returns metrics data', async () => {
      const res = await api
        .get('/v2/stvault/metrics')
        .query({ vault: VAULT_ADDRESS })
        .expect('Content-Type', /json/)
        .expect(200);

      expectSuccess(res.body);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data).toBe('object');
    });
  });
});
