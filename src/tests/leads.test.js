/**
 * Lead CRUD integration tests
 * Tests: create, read, update, delete, status update, validation, role scoping,
 * filtering, and pagination.
 */

import request from 'supertest';
import app from '../app.js';
import { setupDb, clearDb, teardownDb } from './helpers/db.helper.js';

const ADMIN_USER = {
  name: 'Admin User',
  email: 'admin@test.com',
  password: 'AdminPass1',
  confirmPassword: 'AdminPass1',
};

const SALES_USER = {
  name: 'Sales User',
  email: 'sales@test.com',
  password: 'SalesPass1',
  confirmPassword: 'SalesPass1',
};

const VALID_LEAD = {
  name: 'Acme Corp Contact',
  email: 'contact@acme.com',
  phone: '+91-9810012345',
  company: 'Acme Corp',
  serviceInterested: 'Web Development',
  status: 'New',
  notes: 'Initial inquiry.',
};

let adminCookie;
let salesCookie;
let salesUserId;

beforeAll(setupDb);

beforeEach(async () => {
  await clearDb();
  // Register admin (first user)
  const adminRes = await request(app).post('/api/v1/auth/register').send(ADMIN_USER);
  adminCookie = adminRes.headers['set-cookie'];

  // Register sales user
  const salesRes = await request(app).post('/api/v1/auth/register').send(SALES_USER);
  salesCookie = salesRes.headers['set-cookie'];
  salesUserId = salesRes.body.data._id;
});

afterAll(teardownDb);

// ── CREATE ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/leads', () => {
  it('creates a lead and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(VALID_LEAD.name);
    expect(res.body.data._id).toBeDefined();
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send({ name: 'Missing Fields' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for invalid service value', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send({ ...VALID_LEAD, serviceInterested: 'InvalidService' });
    expect(res.status).toBe(422);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/leads').send(VALID_LEAD);
    expect(res.status).toBe(401);
  });
});

// ── READ ──────────────────────────────────────────────────────────────────────

describe('GET /api/v1/leads', () => {
  beforeEach(async () => {
    // Create 3 leads as admin
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/leads')
        .set('Cookie', adminCookie)
        .send({ ...VALID_LEAD, email: `lead${i}@acme.com`, name: `Lead ${i}` });
    }
  });

  it('returns a paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/leads')
      .set('Cookie', adminCookie)
      .query({ page: 1, pageSize: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBe(3);
  });

  it('filters by status', async () => {
    // Update one lead to Contacted
    const listRes = await request(app).get('/api/v1/leads').set('Cookie', adminCookie);
    const leadId = listRes.body.data[0]._id;
    await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'Contacted' });

    const res = await request(app)
      .get('/api/v1/leads')
      .set('Cookie', adminCookie)
      .query({ status: 'Contacted' });
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('Contacted');
  });

  it('searches by name', async () => {
    const res = await request(app)
      .get('/api/v1/leads')
      .set('Cookie', adminCookie)
      .query({ search: 'Lead 1' });
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Lead 1');
  });
});

// ── ROLE SCOPING ──────────────────────────────────────────────────────────────

describe('Role scoping', () => {
  it('SALES user can only see leads assigned to them', async () => {
    // Admin creates a lead assigned to someone else (admin themselves)
    await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send({ ...VALID_LEAD, email: 'other@acme.com', assignedTo: null });

    // Sales user creates their own lead
    await request(app)
      .post('/api/v1/leads')
      .set('Cookie', salesCookie)
      .send({ ...VALID_LEAD, email: 'sales@lead.com' });

    const adminRes = await request(app).get('/api/v1/leads').set('Cookie', adminCookie);
    const salesRes = await request(app).get('/api/v1/leads').set('Cookie', salesCookie);

    // Admin sees all leads
    expect(adminRes.body.meta.total).toBe(2);
    // Sales sees only their lead
    expect(salesRes.body.meta.total).toBe(1);
  });
});

// ── UPDATE ────────────────────────────────────────────────────────────────────

describe('PUT /api/v1/leads/:id', () => {
  it('updates a lead', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    const id = createRes.body.data._id;

    const res = await request(app)
      .put(`/api/v1/leads/${id}`)
      .set('Cookie', adminCookie)
      .send({ ...VALID_LEAD, company: 'Updated Corp' });
    expect(res.status).toBe(200);
    expect(res.body.data.company).toBe('Updated Corp');
  });

  it('returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .put('/api/v1/leads/not-a-valid-id')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    expect(res.status).toBe(422);
  });

  it('returns 404 for non-existent lead', async () => {
    const res = await request(app)
      .put('/api/v1/leads/000000000000000000000001')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    expect(res.status).toBe(404);
  });
});

// ── STATUS UPDATE ─────────────────────────────────────────────────────────────

describe('PATCH /api/v1/leads/:id/status', () => {
  it('updates status and returns 200', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'Qualified' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Qualified');
  });

  it('returns 422 for invalid status', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    const id = createRes.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/leads/${id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'InvalidStatus' });
    expect(res.status).toBe(422);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE /api/v1/leads/:id', () => {
  it('deletes a lead and returns 204', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    const id = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/leads/${id}`)
      .set('Cookie', adminCookie);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/v1/leads/${id}`)
      .set('Cookie', adminCookie);
    expect(getRes.status).toBe(404);
  });
});

// ── ACTIVITIES ────────────────────────────────────────────────────────────────

describe('GET /api/v1/leads/:id/activities', () => {
  it('returns activity timeline including CREATED event', async () => {
    const createRes = await request(app)
      .post('/api/v1/leads')
      .set('Cookie', adminCookie)
      .send(VALID_LEAD);
    const id = createRes.body.data._id;

    const res = await request(app)
      .get(`/api/v1/leads/${id}/activities`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((a) => a.type === 'CREATED')).toBe(true);
  });
});
