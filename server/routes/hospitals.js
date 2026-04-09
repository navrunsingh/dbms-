// routes/hospitals.js — Hospital CRUD
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all hospitals
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Hospital ORDER BY H_ID');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET only authorized hospitals
router.get('/authorized', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Hospital WHERE Is_Authorized = TRUE ORDER BY H_ID');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add hospital
router.post('/', async (req, res) => {
  try {
    const { H_ID, Name, Location, License_No, Is_Authorized } = req.body;
    await pool.query(
      'INSERT INTO Hospital (H_ID, Name, Location, License_No, Is_Authorized) VALUES (?, ?, ?, ?, ?)',
      [H_ID, Name, Location, License_No, Is_Authorized ?? false]
    );
    res.status(201).json({ message: 'Hospital added successfully', H_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
