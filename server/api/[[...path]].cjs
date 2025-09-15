const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../db.js');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const FREE_LIMIT = 3;

// Schemas and Models (guard against re-compilation across cold starts)
const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
);

const noteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);

// Helpers
function signToken(user, tenantSlug) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      tenantId: user.tenantId.toString(),
      ...(tenantSlug ? { tenantSlug } : {}),
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // {sub, role, tenantId}
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

async function loadTenant(req, res, next) {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) return res.status(401).json({ error: 'Tenant not found' });
    req.tenant = tenant;
    next();
  } catch (e) {
    next(e);
  }
}

// Seed data (run once per cold start)
let seeded = false;
async function ensureDefaultData() {
  const count = await User.countDocuments();
  if (count > 0) return; // already has users, skip

  let acme = await Tenant.findOne({ slug: 'acme' });
  if (!acme) acme = await Tenant.create({ name: 'Acme', slug: 'acme', plan: 'free' });

  let globex = await Tenant.findOne({ slug: 'globex' });
  if (!globex) globex = await Tenant.create({ name: 'Globex', slug: 'globex', plan: 'free' });

  const ph = await bcrypt.hash('password', 10);
  const users = [
    { email: 'admin@acme.test', passwordHash: ph, role: 'admin', tenantId: acme._id },
    { email: 'user@acme.test', passwordHash: ph, role: 'member', tenantId: acme._id },
    { email: 'admin@globex.test', passwordHash: ph, role: 'admin', tenantId: globex._id },
    { email: 'user@globex.test', passwordHash: ph, role: 'member', tenantId: globex._id },
  ];
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) continue;
    await User.create(u);
  }
}

// Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const tenant = await Tenant.findById(user.tenantId);
  const token = signToken(user, tenant?.slug);
  res.json({
    token,
    role: user.role,
    tenant: tenant ? { slug: tenant.slug, plan: tenant.plan, name: tenant.name } : undefined,
  });
});

// Users
app.post('/users/invite', authMiddleware, loadTenant, requireRole('admin'), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'email and role required' });
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'invalid role' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'email already exists' });
    const passwordHash = await bcrypt.hash('password', 10);
    const user = await User.create({ email: email.toLowerCase(), role, passwordHash, tenantId: req.tenant._id });
    res.json({ id: user._id, email: user.email, role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to invite user' });
  }
});

// Tenant plan changes
app.post('/tenants/:slug/upgrade', authMiddleware, loadTenant, requireRole('admin'), async (req, res) => {
  const { slug } = req.params;
  if (req.tenant.slug !== slug) return res.status(403).json({ error: 'Cannot modify another tenant' });
  if (req.tenant.plan === 'pro') return res.json({ status: 'already_pro' });
  req.tenant.plan = 'pro';
  await req.tenant.save();
  res.json({ status: 'upgraded', plan: req.tenant.plan });
});

app.post('/tenants/:slug/downgrade', authMiddleware, loadTenant, requireRole('admin'), async (req, res) => {
  const { slug } = req.params;
  if (req.tenant.slug !== slug) return res.status(403).json({ error: 'Cannot modify another tenant' });
  if (req.tenant.plan === 'free') return res.json({ status: 'already_free' });
  req.tenant.plan = 'free';
  await req.tenant.save();
  res.json({ status: 'downgraded', plan: req.tenant.plan });
});

// Notes CRUD
app.post('/notes', authMiddleware, loadTenant, async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  if (req.tenant.plan === 'free') {
    const count = await Note.countDocuments({ tenantId: req.tenant._id });
    if (count >= FREE_LIMIT) {
      return res.status(402).json({ error: 'note_limit_reached', message: 'Upgrade to Pro for unlimited notes' });
    }
  }

  const note = await Note.create({
    tenantId: req.tenant._id,
    authorId: req.user.sub,
    title,
    content: content || '',
  });
  res.json(note);
});

app.get('/notes', authMiddleware, loadTenant, async (req, res) => {
  const notes = await Note.find({ tenantId: req.tenant._id }).sort({ createdAt: -1 });
  res.json(notes);
});

app.get('/notes/:id', authMiddleware, loadTenant, async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

app.put('/notes/:id', authMiddleware, loadTenant, async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { $set: { ...(title !== undefined ? { title } : {}), ...(content !== undefined ? { content } : {}) } },
    { new: true }
  );
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

app.delete('/notes/:id', authMiddleware, loadTenant, async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id });
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'deleted' });
});

// Export serverless handler
module.exports = async (req, res) => {
  try {
    await connectDB();
    if (!seeded) {
      await ensureDefaultData();
      seeded = true;
    }
    return app(req, res);
  } catch (err) {
    console.error('Handler error', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};
