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
    const { O_ID, Type, Harvest_Time, Expiry_Time, Status, Donor_ID } = req.body;
    
    // Auto-fetch Blood_Group from Donor
    const [donors] = await pool.query('SELECT Blood_group FROM Donor WHERE D_ID = ?', [Donor_ID]);
    if (donors.length === 0) return res.status(400).json({ error: 'Donor not found' });
    const Blood_Group = donors[0].Blood_group;

    await pool.query(
      'INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status || 'Available', Donor_ID]
    );
    res.status(201).json({ message: 'Organ added successfully', O_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update organ
router.put('/:id', async (req, res) => {
  try {
    const { Type, Harvest_Time, Expiry_Time, Status, Donor_ID } = req.body;

    // Auto-fetch Blood_Group from Donor
    const [donors] = await pool.query('SELECT Blood_group FROM Donor WHERE D_ID = ?', [Donor_ID]);
    if (donors.length === 0) return res.status(400).json({ error: 'Donor not found' });
    const Blood_Group = donors[0].Blood_group;

    const [result] = await pool.query(
      'UPDATE Organ SET Type = ?, Blood_Group = ?, Harvest_Time = ?, Expiry_Time = ?, Status = ?, Donor_ID = ? WHERE O_ID = ?',
      [Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Organ not found' });
    res.json({ message: 'Organ updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE organ
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Organ WHERE O_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Organ not found' });
    res.json({ message: 'Organ deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
