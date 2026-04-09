// routes/surgeries.js — Surgery Record Management
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all surgeries (with match details)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.S_ID, s.Surgery_Date, s.Outcome,
             mr.M_ID, mr.Compatibility_Score,
             o.Type AS Organ_Type,
             r.Name AS Recipient_Name,
             h.Name AS Hospital_Name
      FROM Surgery_Record s
      JOIN Match_Record mr ON s.Match_ID = mr.M_ID
      JOIN Organ o ON mr.Organ_ID = o.O_ID
      JOIN Recipient r ON mr.Recipient_ID = r.R_ID
      JOIN Hospital h ON mr.Hospital_ID = h.H_ID
      ORDER BY s.Surgery_Date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST record a surgery outcome
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { S_ID, Surgery_Date, Outcome, Match_ID } = req.body;

    await conn.beginTransaction();

    // Insert surgery record
    await conn.query(
      'INSERT INTO Surgery_Record (S_ID, Surgery_Date, Outcome, Match_ID) VALUES (?, ?, ?, ?)',
      [S_ID, Surgery_Date || new Date().toISOString().slice(0, 10), Outcome, Match_ID]
    );

    // If surgery was successful, mark organ as 'Used'
    if (Outcome === 'Successful') {
      await conn.query(`
        UPDATE Organ o
        JOIN Match_Record mr ON o.O_ID = mr.Organ_ID
        SET o.Status = 'Used'
        WHERE mr.M_ID = ?
      `, [Match_ID]);
    }

    await conn.commit();
    res.status(201).json({ message: 'Surgery recorded successfully', S_ID });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
