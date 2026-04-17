# stVault Integration Tests

Black-box HTTP integration tests for stVault APIs using **Jest + Supertest**.
Tests hit a real running server — no mocks.

## Setup

```bash
cd tests/integration
npm install
```

## Run

```bash
# Against local dev server (http://localhost:8000)
npm test

# Against a specific environment
STVAULT_API_BASE_URL=https://staging.example.com npm test
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STVAULT_API_BASE_URL` | No | Base URL, defaults to `http://localhost:8000` |
| `STVAULT_AUTH_TOKEN` | No | JWT token for authenticated endpoints (skipped if unset) |
| `STVAULT_VAULT_ADDRESS` | No | A real vault address for read-only queries |
| `STVAULT_VAULT_OWNER` | No | A vault owner address for list queries |
| `STVAULT_INTERNAL_TOKEN` | No | Internal service token for operator endpoints |

**Public tests** (statistics, metrics param validation, auth guards) always run.
**Authenticated tests** run only when `STVAULT_AUTH_TOKEN` is set.
**Operator tests** run only when `STVAULT_INTERNAL_TOKEN` is set.

## CI Usage

```yaml
# GitHub Actions example
- name: Run stVault integration tests
  working-directory: tests/integration
  env:
    STVAULT_API_BASE_URL: ${{ secrets.STAGING_API_URL }}
    STVAULT_AUTH_TOKEN: ${{ secrets.STAGING_AUTH_TOKEN }}
    STVAULT_VAULT_ADDRESS: ${{ secrets.STAGING_VAULT_ADDRESS }}
    STVAULT_VAULT_OWNER: ${{ secrets.STAGING_VAULT_OWNER }}
  run: |
    npm ci
    npm run test:ci
```

Test results are written to `reports/junit.xml` when `CI=true`.
