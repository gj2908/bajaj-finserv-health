require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { processBfhlData } = require('./src/processor');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS (Ultra Permissive) ────────────────────────────────────────────────
app.use(cors()); // Defaults to Access-Control-Allow-Origin: *

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json());

// ─── Identity ──────────────────────────────────────────────────────────────
const IDENTITY = {
  user_id:            process.env.USER_ID       || 'gaurang_jadoun',
  email_id:           process.env.EMAIL         || 'gj6117@srmist.edu.in',
  college_roll_number: process.env.ROLL_NUMBER  || 'RA2311004030007',
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
  });
}

module.exports = app;
