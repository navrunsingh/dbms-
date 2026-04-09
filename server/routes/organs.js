// routes/organs.js — Organ CRUD
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all organs (with donor name)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, d.Name AS Donor_Name
      FROM Organ o
      LEFT JOIN Donor d ON o.Donor_ID = d.D_ID
      ORDER BY o.O_ID
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET available organs only
router.get('/available', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, d.Name AS Donor_Name
      FROM Organ o
      LEFT JOIN Donor d ON o.Donor_ID = d.D_ID
      WHERE o.Status = 'Available' AND o.Expiry_Time > NOW()
      ORDER BY o.O_ID
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add organ
router.post('/', async (req, res) => {
  try {
    const { O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID } = req.body;
    await pool.query(
      'INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status || 'Available', Donor_ID]
    );
    res.status(201).json({ message: 'Organ added successfully', O_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
