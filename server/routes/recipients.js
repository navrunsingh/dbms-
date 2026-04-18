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

// PUT update recipient
router.put('/:id', async (req, res) => {
  try {
    const { Name, Age, Blood_Group, Medical_Urgency_Score } = req.body;
    const [result] = await pool.query(
      'UPDATE Recipient SET Name = ?, Age = ?, Blood_Group = ?, Medical_Urgency_Score = ? WHERE R_ID = ?',
      [Name, Age, Blood_Group, Medical_Urgency_Score, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Recipient not found' });
    res.json({ message: 'Recipient updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE recipient
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Recipient WHERE R_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Recipient not found' });
    res.json({ message: 'Recipient deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
