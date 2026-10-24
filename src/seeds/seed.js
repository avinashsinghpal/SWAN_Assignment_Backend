/**
 * Seed script for Swan LMS.
 *
 * Run with: npm run seed (from /server)
 *
 * Creates:
 * - 1 admin user
 * - 2 sales users
 * - 60-80 realistic leads spread over the last 60 days
 * - Matching LeadActivity records for each lead
 *
 * Idempotent: clears all existing data before re-seeding.
 * No emoji. Realistic Indian and international companies.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config as loadDotenv } from 'dotenv';
loadDotenv();

import User from '../models/User.js';
import Lead, { LEAD_STATUSES, LEAD_SERVICES } from '../models/Lead.js';
import LeadActivity from '../models/LeadActivity.js';
import { MONGODB_URI } from '../config/index.js';

const BCRYPT_ROUNDS = 12;

// ── Seed Users ───────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    name: 'Arjun Mehta',
    email: 'admin@swandigital.io',
    password: 'Admin@1234',
    role: 'ADMIN',
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sales@swandigital.io',
    password: 'Sales@1234',
    role: 'SALES',
  },
  {
    name: 'Rohan Verma',
    email: 'rohan.sales@swandigital.io',
    password: 'Sales@1234',
    role: 'SALES',
  },
];

// ── Realistic Company Names ──────────────────────────────────────────────────

const COMPANIES = [
  'Infosys Ltd',
  'Tata Consultancy Services',
  'Wipro Technologies',
  'HCL Technologies',
  'Tech Mahindra',
  'Mindtree Solutions',
  'Mphasis Corp',
  'Hexaware Technologies',
  'Persistent Systems',
  'Zensar Technologies',
  'NIIT Technologies',
  'Cyient Ltd',
  'Birlasoft Limited',
  'Mastech Holdings',
  'Nucleus Software',
  'Accenture India',
  'Cognizant Technology Solutions',
  'Capgemini India',
  'IBM India',
  'Oracle India',
  'SAP India',
  'Salesforce India',
  'Adobe Systems India',
  'Cisco Systems India',
  'Microsoft India',
  'Amazon Web Services India',
  'Google India',
  'Freshworks Inc',
  'Zoho Corporation',
  'Razorpay',
  'Paytm',
  'Swiggy',
  'Zomato',
  'OYO Rooms',
  'Byju\'s',
  'Unacademy',
  'Nykaa',
  'Meesho',
  'Delhivery',
  'Ola Cabs',
  'Pine Labs',
  'PhonePe',
  'Groww',
  'Zerodha',
  'HDFC Bank Digital',
  'ICICI Bank FinTech',
  'Axis Digital',
  'Kotak Securities',
  'Bajaj Finserv',
  'PolicyBazaar',
];

// ── Realistic Contact Names ───────────────────────────────────────────────────

const CONTACTS = [
  { name: 'Aditya Kumar', phone: '+91-9810012345' },
  { name: 'Sneha Patel', phone: '+91-9820023456' },
  { name: 'Vikram Singh', phone: '+91-9830034567' },
  { name: 'Anjali Gupta', phone: '+91-9840045678' },
  { name: 'Rahul Joshi', phone: '+91-9850056789' },
  { name: 'Neha Agarwal', phone: '+91-9860067890' },
  { name: 'Siddharth Rao', phone: '+91-9870078901' },
  { name: 'Pooja Desai', phone: '+91-9880089012' },
  { name: 'Manish Tiwari', phone: '+91-9890090123' },
  { name: 'Kavya Nair', phone: '+91-9900101234' },
  { name: 'Suresh Reddy', phone: '+91-9910112345' },
  { name: 'Divya Menon', phone: '+91-9920123456' },
  { name: 'Prakash Iyer', phone: '+91-9930134567' },
  { name: 'Ananya Krishnan', phone: '+91-9940145678' },
  { name: 'Deepak Sharma', phone: '+91-9950156789' },
  { name: 'Lakshmi Subramaniam', phone: '+91-9960167890' },
  { name: 'Nikhil Bose', phone: '+91-9970178901' },
  { name: 'Ritika Ghosh', phone: '+91-9980189012' },
  { name: 'Amit Trivedi', phone: '+91-9990190123' },
  { name: 'Sunita Pillai', phone: '+91-8800201234' },
  { name: 'James Thornton', phone: '+44-7911-123456' },
  { name: 'Sarah Mitchell', phone: '+1-650-555-0101' },
  { name: 'Michael Chen', phone: '+1-415-555-0202' },
  { name: 'Emma Watson', phone: '+44-7700-900345' },
  { name: 'Liam O\'Brien', phone: '+353-85-123-4567' },
  { name: 'Sofia Andersen', phone: '+45-20-123-456' },
  { name: 'Carlos Rivera', phone: '+1-305-555-0303' },
  { name: 'Mei Lin Zhang', phone: '+65-9123-4567' },
  { name: 'Omar Al-Rashid', phone: '+971-50-123-4567' },
  { name: 'Fatima Al-Zahra', phone: '+966-55-123-4567' },
];

// ── Sample Notes ──────────────────────────────────────────────────────────────

const NOTES_SAMPLES = [
  'Initial inquiry via the website contact form. Interested in a long-term engagement.',
  'Attended our webinar on digital marketing. Very engaged, asked detailed questions.',
  'Referred by an existing client. Looking for a mobile app for their field team.',
  'Budget range: 5-10 lakhs. Decision expected by end of quarter.',
  'Requested a detailed proposal with timeline and resource breakdown.',
  'Currently evaluating three vendors. Need a competitive proposal.',
  'Technical stakeholder wants a demo of our CMS capabilities.',
  'Startup in early stage, limited budget but high growth potential.',
  'Enterprise client with complex integration requirements (SAP, Salesforce).',
  'Needs SEO audit first before committing to a full campaign.',
  'Small business looking for a social media presence boost.',
  'Follow up after demo was positive. Waiting for budget approval.',
  '',
  '',
  '',
];

// ── Helper Functions ──────────────────────────────────────────────────────────

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a date in the past, between daysBack and 0 days ago.
 * @param {number} maxDaysBack
 * @returns {Date}
 */
function randomPastDate(maxDaysBack) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, maxDaysBack));
  d.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return d;
}

/**
 * Generate a follow-up date: some overdue (past), some today, some future.
 * Returns null 20% of the time (no follow-up set).
 * @returns {Date | null}
 */
function randomFollowUpDate() {
  const r = Math.random();
  if (r < 0.2) return null;
  const d = new Date();
  if (r < 0.4) {
    // Overdue: 1-30 days ago
    d.setDate(d.getDate() - randomInt(1, 30));
  } else if (r < 0.5) {
    // Today
  } else {
    // Future: 1-30 days from now
    d.setDate(d.getDate() + randomInt(1, 30));
  }
  return d;
}

// ── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // Idempotent: clear existing data
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    LeadActivity.deleteMany({}),
  ]);
  console.log('Existing data cleared.');

  // ── Create users ──────────────────────────────────────────────────────────
  console.log('Seeding users...');
  const hashedUsers = await Promise.all(
    SEED_USERS.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, BCRYPT_ROUNDS),
    }))
  );
  const createdUsers = await User.insertMany(hashedUsers);
  const [adminUser, salesUser1, salesUser2] = createdUsers;
  const salesUsers = [salesUser1, salesUser2];
  console.log(`Created ${createdUsers.length} users.`);

  // ── Create leads ──────────────────────────────────────────────────────────
  console.log('Seeding leads...');
  const leadCount = randomInt(65, 75);
  const leadsToInsert = [];
  const usedEmails = new Set();

  const contactPool = [...CONTACTS];
  // Shuffle
  contactPool.sort(() => Math.random() - 0.5);

  for (let i = 0; i < leadCount; i++) {
    const contact = contactPool[i % contactPool.length];
    const company = randomFrom(COMPANIES);
    const service = randomFrom(LEAD_SERVICES);

    // Generate unique email
    let email;
    let attempt = 0;
    do {
      const suffix = attempt > 0 ? `${attempt}` : '';
      email = `${contact.name.toLowerCase().replace(/[^a-z]/g, '.')}.${i}${suffix}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`;
      attempt++;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    const createdBy = randomFrom([adminUser, ...salesUsers]);
    const assignedTo = randomFrom(salesUsers);
    const createdAt = randomPastDate(60);
    const status = randomFrom(LEAD_STATUSES);

    leadsToInsert.push({
      name: contact.name,
      searchName: contact.name.toLowerCase(),
      email,
      phone: contact.phone,
      company,
      serviceInterested: service,
      status,
      followUpDate: randomFollowUpDate(),
      notes: randomFrom(NOTES_SAMPLES),
      createdBy: createdBy._id,
      assignedTo: assignedTo._id,
      createdAt,
      updatedAt: createdAt,
    });
  }

  const createdLeads = await Lead.insertMany(leadsToInsert);
  console.log(`Created ${createdLeads.length} leads.`);

  // ── Create activity records ───────────────────────────────────────────────
  console.log('Seeding activity records...');
  const activities = [];

  for (const lead of createdLeads) {
    const creator = createdUsers.find((u) => u._id.equals(lead.createdBy));
    // CREATED activity
    activities.push({
      lead: lead._id,
      user: lead.createdBy,
      type: 'CREATED',
      message: `Lead created by ${creator?.name || 'system'}`,
      changes: {},
      createdAt: lead.createdAt,
    });

    // Some leads get a STATUS_CHANGED activity
    if (lead.status !== 'New' && Math.random() > 0.3) {
      const updater = randomFrom(createdUsers);
      const updatedAt = new Date(lead.createdAt);
      updatedAt.setDate(updatedAt.getDate() + randomInt(1, 10));
      activities.push({
        lead: lead._id,
        user: updater._id,
        type: 'STATUS_CHANGED',
        message: `Status changed from New to ${lead.status} by ${updater.name}`,
        changes: { status: { old: 'New', new: lead.status } },
        createdAt: updatedAt,
      });
    }

    // Some leads get a NOTE activity
    if (lead.notes && Math.random() > 0.5) {
      const noter = randomFrom(createdUsers);
      const notedAt = new Date(lead.createdAt);
      notedAt.setDate(notedAt.getDate() + randomInt(0, 5));
      activities.push({
        lead: lead._id,
        user: noter._id,
        type: 'NOTE',
        message: `Note added by ${noter.name}`,
        changes: { notes: { old: '', new: lead.notes } },
        createdAt: notedAt,
      });
    }
  }

  await LeadActivity.insertMany(activities);
  console.log(`Created ${activities.length} activity records.`);

  // ── Print demo credentials ────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log('  Seed completed successfully.');
  console.log('======================================================');
  console.log('\n  Demo Credentials\n');
  console.log('  Role   : ADMIN');
  console.log('  Email  : admin@swandigital.io');
  console.log('  Password: Admin@1234\n');
  console.log('  Role   : SALES');
  console.log('  Email  : priya.sales@swandigital.io');
  console.log('  Password: Sales@1234\n');
  console.log('  Role   : SALES');
  console.log('  Email  : rohan.sales@swandigital.io');
  console.log('  Password: Sales@1234\n');
  console.log('======================================================\n');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
