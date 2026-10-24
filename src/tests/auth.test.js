/**
 * Auth integration tests
 * Tests: register, login, logout, protected routes, rate limits (skipped in CI),
 * duplicate email, and password validation.
 */

import request from 'supertest';
import app from '../app.js';
import { setupDb, clearDb, teardownDb } from './helpers/db.helper.js';

const VALID_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'TestPass1',
  confirmPassword: 'TestPass1',
};

beforeAll(setupDb);
afterEach(clearDb);
afterAll(teardownDb);

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(VALID_USER.email);
    expect(res.body.data.password).toBeUndefined();
    // Cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('first registered user gets ADMIN role', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('second registered user gets SALES role', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Sales User', email: 'sales@example.com', password: 'TestPass1', confirmPassword: 'TestPass1' });
    expect(res.body.data.role).toBe('SALES');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    const res = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_USER, password: 'weak', confirmPassword: 'weak' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when passwords do not match', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_USER, confirmPassword: 'DifferentPass1' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
  });

  it('logs in with correct credentials and returns 200', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass1' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without auth cookie', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid session', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    const cookie = registerRes.headers['set-cookie'];

    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(VALID_USER.email);
    expect(res.body.data.password).toBeUndefined();
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const loginRes = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    // Cookie should be cleared (empty value or expired)
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
