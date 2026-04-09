// routes/consent.js — Consent Document Management
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all consent documents (with donor name)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cd.*, d.Name AS Donor_Name
      FROM Consent_Document cd
      JOIN Donor d ON cd.Donor_ID = d.D_ID
      ORDER BY cd.C_ID
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create consent document
router.post('/', async (req, res) => {
  try {
    const { C_ID, Document_Type, Approval_Status, Donor_ID } = req.body;
    await pool.query(
      'INSERT INTO Consent_Document (C_ID, Document_Type, Approval_Status, Upload_Date, Donor_ID) VALUES (?, ?, ?, CURRENT_DATE, ?)',
      [C_ID, Document_Type, Approval_Status || 'Pending', Donor_ID]
    );
    res.status(201).json({ message: 'Consent document created', C_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT approve/reject consent document
router.put('/:id', async (req, res) => {
  try {
    const { Approval_Status } = req.body;
    if (!['Approved', 'Pending', 'Rejected'].includes(Approval_Status)) {
      return res.status(400).json({ error: 'Invalid status. Must be Approved, Pending, or Rejected.' });
    }
    const [result] = await pool.query(
      'UPDATE Consent_Document SET Approval_Status = ? WHERE C_ID = ?',
      [Approval_Status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: `Consent document ${req.params.id} updated to ${Approval_Status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
