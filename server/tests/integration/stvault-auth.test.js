/**
 * stVault Authenticated API integration tests.
 *
 * These endpoints require a valid JWT token. Tests are skipped
 * when STVAULT_AUTH_TOKEN is not set, so CI can choose to run
 * only the public suite if credentials are unavailable.
 */
const {
  api,
  AUTH_TOKEN,
  VAULT_ADDRESS,
  VAULT_OWNER,
  expectEnvelope,
  expectSuccess,
  expectError,
  authHeader,
  isEthAddress,
  isNonNegativeNumericString,
} = require('./helpers');

const describeAuth = AUTH_TOKEN ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Auth guard: unauthenticated requests must be rejected
// ---------------------------------------------------------------------------
describe('Auth guard on protected endpoints', () => {
  const protectedGets = [
    '/v2/stvault/list',
    '/v2/stvault/dashboard/list',
    '/v2/stvault/refresh',
    '/v2/stvault/refresh/balance',
    '/v2/stvault/refresh/mint_balance',
  ];

  const protectedPosts = [
    '/v2/stvault/create',
    '/v2/stvault/create/hash',
    '/v2/stvault/supply',
    '/v2/stvault/withdraw',
    '/v2/stvault/mint_steth',
    '/v2/stvault/repay_steth',
  ];

  test.each(protectedGets)('GET %s rejects without token', async (path) => {
    const res = await api.get(path);
    // Server may return HTTP 401 or 200 with error envelope
    expect([200, 401]).toContain(res.status);
    expectError(res.body, 401);
  });

  test.each(protectedPosts)('POST %s rejects without token', async (path) => {
    const res = await api.post(path).send({});
    expect([200, 401]).toContain(res.status);
    expectError(res.body, 401);
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/list
// ---------------------------------------------------------------------------
describeAuth('GET /v2/stvault/list', () => {
  it('returns 400 when vault_owner is missing', async () => {
    const res = await api
      .get('/v2/stvault/list')
      .set(authHeader())
      .expect(200);

    expectError(res.body, 400);
  });

  const describeWithOwner = VAULT_OWNER ? describe : describe.skip;

  describeWithOwner('with vault_owner', () => {
    it('returns a list with rated_apr', async () => {
      const res = await api
        .get('/v2/stvault/list')
        .set(authHeader())
        .query({ vault_owner: VAULT_OWNER })
        .expect(200);

      expectSuccess(res.body);
      const { data } = res.body;
      expect(data).toHaveProperty('rated_apr');
      expect(data).toHaveProperty('vaults');
      expect(Array.isArray(data.vaults)).toBe(true);
    });

    it('vaults array items have expected fields', async () => {
      const res = await api
        .get('/v2/stvault/list')
        .set(authHeader())
        .query({ vault_owner: VAULT_OWNER })
        .expect(200);

      const { vaults } = res.body.data;
      if (vaults.length > 0) {
        const vault = vaults[0];
        expect(vault).toHaveProperty('vault');
        expect(isEthAddress(vault.vault)).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/dashboard/list
// ---------------------------------------------------------------------------
describeAuth('GET /v2/stvault/dashboard/list', () => {
  it('returns 400 when vault_owner is missing', async () => {
    const res = await api
      .get('/v2/stvault/dashboard/list')
      .set(authHeader())
      .expect(200);

    expectError(res.body, 400);
  });

  const describeWithOwner = VAULT_OWNER ? describe : describe.skip;

  describeWithOwner('with vault_owner', () => {
    it('returns dashboard list with rated_apr and vaults', async () => {
      const res = await api
        .get('/v2/stvault/dashboard/list')
        .set(authHeader())
        .query({ vault_owner: VAULT_OWNER })
        .expect(200);

      expectSuccess(res.body);
      const { data } = res.body;
      expect(data).toHaveProperty('rated_apr');
      expect(data).toHaveProperty('vaults');
      expect(Array.isArray(data.vaults)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/refresh
// ---------------------------------------------------------------------------
describeAuth('GET /v2/stvault/refresh', () => {
  it('returns 400 when vault param is missing', async () => {
    const res = await api
      .get('/v2/stvault/refresh')
      .set(authHeader())
      .expect(200);

    expectError(res.body, 400);
  });

  it('returns 400 for a non-existent vault', async () => {
    const res = await api
      .get('/v2/stvault/refresh')
      .set(authHeader())
      .query({ vault: '0x0000000000000000000000000000000000000000' })
      .expect(200);

    expectError(res.body, 400);
  });

  const describeWithVault = VAULT_ADDRESS ? describe : describe.skip;

  describeWithVault('with a real vault', () => {
    it('refreshes and returns vault info', async () => {
      const res = await api
        .get('/v2/stvault/refresh')
        .set(authHeader())
        .query({ vault: VAULT_ADDRESS })
        .expect(200);

      expectSuccess(res.body);
      expect(typeof res.body.data).toBe('object');
    });
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/refresh/balance
// ---------------------------------------------------------------------------
describeAuth('GET /v2/stvault/refresh/balance', () => {
  it('returns 400 when vault param is missing', async () => {
    const res = await api
      .get('/v2/stvault/refresh/balance')
      .set(authHeader())
      .expect(200);

    expectError(res.body, 400);
  });

  const describeWithVault = VAULT_ADDRESS ? describe : describe.skip;

  describeWithVault('with a real vault', () => {
    it('returns balance, total_value, withdrawable_value', async () => {
      const res = await api
        .get('/v2/stvault/refresh/balance')
        .set(authHeader())
        .query({ vault: VAULT_ADDRESS })
        .expect(200);

      expectSuccess(res.body);
      const { data } = res.body;
      expect(data).toHaveProperty('balance');
      expect(data).toHaveProperty('total_value');
      expect(data).toHaveProperty('withdrawable_value');
      // All values should be non-negative numeric strings (wei)
      expect(isNonNegativeNumericString(data.balance)).toBe(true);
      expect(isNonNegativeNumericString(data.total_value)).toBe(true);
      expect(isNonNegativeNumericString(data.withdrawable_value)).toBe(true);
      // Invariant: withdrawable_value <= total_value
      expect(BigInt(data.withdrawable_value)).toBeLessThanOrEqual(
        BigInt(data.total_value),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// GET /v2/stvault/refresh/mint_balance
// ---------------------------------------------------------------------------
describeAuth('GET /v2/stvault/refresh/mint_balance', () => {
  it('returns 400 when vault param is missing', async () => {
    const res = await api
      .get('/v2/stvault/refresh/mint_balance')
      .set(authHeader())
      .expect(200);

    expectError(res.body, 400);
  });

  const describeWithVault = VAULT_ADDRESS ? describe : describe.skip;

  describeWithVault('with a real vault', () => {
    it('returns liability_steth and remaining_minting_capacity_steth', async () => {
      const res = await api
        .get('/v2/stvault/refresh/mint_balance')
        .set(authHeader())
        .query({ vault: VAULT_ADDRESS })
        .expect(200);

      expectSuccess(res.body);
      const { data } = res.body;
      expect(data).toHaveProperty('liability_steth');
      expect(data).toHaveProperty('remaining_minting_capacity_steth');
      expect(isNonNegativeNumericString(data.liability_steth)).toBe(true);
      expect(isNonNegativeNumericString(data.remaining_minting_capacity_steth)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// POST /v2/stvault/create — param validation only (no actual creation)
// ---------------------------------------------------------------------------
describeAuth('POST /v2/stvault/create', () => {
  it('returns 400 when from_address is missing', async () => {
    const res = await api
      .post('/v2/stvault/create')
      .set(authHeader())
      .send({})
      .expect(200);

    expectError(res.body, 400);
  });

  it('returns 400 for an invalid from_address', async () => {
    const res = await api
      .post('/v2/stvault/create')
      .set(authHeader())
      .send({ from_address: 'not-an-address' })
      .expect(200);

    expectError(res.body, 400);
  });
});

// ---------------------------------------------------------------------------
// POST /v2/stvault/supply — param validation only
// ---------------------------------------------------------------------------
describeAuth('POST /v2/stvault/supply', () => {
  it('returns 400 when required params are missing', async () => {
    const res = await api
      .post('/v2/stvault/supply')
      .set(authHeader())
      .send({})
      .expect(200);

    expectError(res.body, 400);
  });

  it('returns 400 for a non-existent vault', async () => {
    const res = await api
      .post('/v2/stvault/supply')
      .set(authHeader())
      .send({
        from_address: '0x0000000000000000000000000000000000000001',
        vault: '0x0000000000000000000000000000000000000000',
        amount: '1',
      })
      .expect(200);

    expectError(res.body, 400);
  });
});

// ---------------------------------------------------------------------------
// POST /v2/stvault/withdraw — param validation only
// ---------------------------------------------------------------------------
describeAuth('POST /v2/stvault/withdraw', () => {
  it('returns 400 when required params are missing', async () => {
    const res = await api
      .post('/v2/stvault/withdraw')
      .set(authHeader())
      .send({})
      .expect(200);

    expectError(res.body, 400);
  });
});

// ---------------------------------------------------------------------------
// POST /v2/stvault/mint_steth — param validation only
// ---------------------------------------------------------------------------
describeAuth('POST /v2/stvault/mint_steth', () => {
  it('returns 400 when required params are missing', async () => {
    const res = await api
      .post('/v2/stvault/mint_steth')
      .set(authHeader())
      .send({})
      .expect(200);

    expectError(res.body, 400);
  });
});

// ---------------------------------------------------------------------------
// POST /v2/stvault/repay_steth — param validation only
// ---------------------------------------------------------------------------
describeAuth('POST /v2/stvault/repay_steth', () => {
  it('returns 400 when required params are missing', async () => {
    const res = await api
      .post('/v2/stvault/repay_steth')
      .set(authHeader())
      .send({})
      .expect(200);

    expectError(res.body, 400);
  });
});
