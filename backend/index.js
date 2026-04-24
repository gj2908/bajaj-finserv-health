require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processBfhlData } = require('./src/processor');

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ─── CORS ──────────────────────────────────────────────────────────────────
const corsOptions = {
  origin:
    CORS_ORIGIN === '*'
      ? true
      : CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions)); // pre-flight

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json());

// ─── Identity (configure via .env) ─────────────────────────────────────────
const IDENTITY = {
  user_id:            process.env.USER_ID       || 'fullname_ddmmyyyy',
  email_id:           process.env.EMAIL         || 'you@srmist.edu.in',
  college_roll_number: process.env.ROLL_NUMBER  || 'RA2211003011234',
};

// ─── POST /bfhl ────────────────────────────────────────────────────────────
app.post('/bfhl', (req, res) => {
  const { data } = req.body ?? {};

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      is_success: false,
      error: 'Request body must contain a "data" array.',
    });
  }

  try {
    const result = processBfhlData(data);

    return res.status(200).json({
      is_success: true,
      ...IDENTITY,
      ...result,
    });
  } catch (err) {
    console.error('Processing error:', err);
    return res.status(500).json({
      is_success: false,
      error: 'Internal server error.',
    });
  }
});

// ─── GET /bfhl (hint) ──────────────────────────────────────────────────────
app.get('/bfhl', (_req, res) => {
  res.status(200).json({
    operation_code: 1,
    message: 'Send a POST request to /bfhl with { "data": [...] }',
  });
});

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── GET / (Root response) ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'BFHL API is running',
    developer: IDENTITY,
    endpoints: {
      post_bfhl: '/bfhl',
      get_bfhl: '/bfhl',
      health: '/health'
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅  BFHL API running  →  http://localhost:${PORT}`);
    console.log('   POST /bfhl  — main endpoint');
    console.log('   GET  /bfhl  — usage hint');
    console.log('   GET  /health — health check');
  });
}

module.exports = app;
