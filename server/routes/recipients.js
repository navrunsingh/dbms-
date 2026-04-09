// routes/recipients.js — Recipient CRUD
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all recipients ordered by urgency
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Recipient ORDER BY Medical_Urgency_Score DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register a new recipient
router.post('/', async (req, res) => {
  try {
    const { R_ID, Name, Age, Blood_Group, Medical_Urgency_Score } = req.body;
    await pool.query(
      'INSERT INTO Recipient (R_ID, Name, Age, Blood_Group, Medical_Urgency_Score, Registration_Date) VALUES (?, ?, ?, ?, ?, CURRENT_DATE)',
      [R_ID, Name, Age, Blood_Group, Medical_Urgency_Score]
    );
    res.status(201).json({ message: 'Recipient registered successfully', R_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
