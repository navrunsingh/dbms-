// routes/donors.js — Donor CRUD & Search
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all donors
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Donor ORDER BY D_ID');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search donors
router.get('/search', async (req, res) => {
  try {
    const { name, blood_group, city } = req.query;
    let sql = 'SELECT * FROM Donor WHERE 1=1';
    const params = [];
    if (name) { sql += ' AND Name LIKE ?'; params.push(`%${name}%`); }
    if (blood_group) { sql += ' AND Blood_group = ?'; params.push(blood_group); }
    if (city) { sql += ' AND City LIKE ?'; params.push(`%${city}%`); }
    sql += ' ORDER BY D_ID';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single donor
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Donor WHERE D_ID = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Donor not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create donor
router.post('/', async (req, res) => {
  try {
    const { D_ID, Name, Age, Blood_group, Contact_no, City, Is_Alive } = req.body;
    await pool.query(
      'INSERT INTO Donor (D_ID, Name, Age, Blood_group, Contact_no, City, Is_Alive) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [D_ID, Name, Age, Blood_group, Contact_no, City, Is_Alive ?? true]
    );
    res.status(201).json({ message: 'Donor registered successfully', D_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update donor
router.put('/:id', async (req, res) => {
  try {
    const { Name, Age, Blood_group, Contact_no, City, Is_Alive } = req.body;
    const [result] = await pool.query(
      'UPDATE Donor SET Name = ?, Age = ?, Blood_group = ?, Contact_no = ?, City = ?, Is_Alive = ? WHERE D_ID = ?',
      [Name, Age, Blood_group, Contact_no, City, Is_Alive, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Donor not found' });
    res.json({ message: 'Donor updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE donor
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM Donor WHERE D_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Donor not found' });
    res.json({ message: 'Donor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
