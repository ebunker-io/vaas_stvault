// Ensure supertest does not go through HTTP proxies for local testing
delete process.env.http_proxy;
delete process.env.HTTP_PROXY;
delete process.env.https_proxy;
delete process.env.HTTPS_PROXY;

const supertest = require('supertest');

/**
 * Base URL for the API under test.
 * Set via STVAULT_API_BASE_URL env var (no trailing slash).
 * Defaults to http://localhost:8000/apis for local dev.
 */
const BASE_URL = process.env.STVAULT_API_BASE_URL || 'http://localhost:8000/apis';

/**
 * JWT token for authenticated endpoints.
 * Set via STVAULT_AUTH_TOKEN env var.
 */
const AUTH_TOKEN = process.env.STVAULT_AUTH_TOKEN || '';

/**
 * A known vault address that exists in the target environment.
 * Set via STVAULT_VAULT_ADDRESS env var.
 */
const VAULT_ADDRESS = process.env.STVAULT_VAULT_ADDRESS || '';

/**
 * A known vault_owner address for list queries.
 * Set via STVAULT_VAULT_OWNER env var.
 */
const VAULT_OWNER = process.env.STVAULT_VAULT_OWNER || '';

const api = supertest(BASE_URL);

/** Shared schema matchers */
const ENVELOPE_SCHEMA = {
  code: expect.any(Number),
  msg: expect.any(String),
  success: expect.any(Boolean),
};

function expectEnvelope(body) {
  expect(body).toMatchObject(ENVELOPE_SCHEMA);
}

function expectSuccess(body) {
  expectEnvelope(body);
  expect(body.code).toBe(200);
  expect(body.success).toBe(true);
  expect(body).toHaveProperty('data');
}

function expectError(body, expectedCode) {
  expectEnvelope(body);
  expect(body.success).toBe(false);
  if (expectedCode !== undefined) {
    expect(body.code).toBe(expectedCode);
  }
}

function authHeader() {
  if (!AUTH_TOKEN) return {};
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

function isEthAddress(val) {
  return typeof val === 'string' && /^0x[0-9a-fA-F]{40}$/.test(val);
}

function isNonNegativeNumericString(val) {
  return typeof val === 'string' && !isNaN(val) && Number(val) >= 0;
}

module.exports = {
  BASE_URL,
  AUTH_TOKEN,
  VAULT_ADDRESS,
  VAULT_OWNER,
  api,
  expectEnvelope,
  expectSuccess,
  expectError,
  authHeader,
  isEthAddress,
  isNonNegativeNumericString,
};
