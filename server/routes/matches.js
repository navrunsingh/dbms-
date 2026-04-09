// routes/matches.js — Match Records & Smart Match Finding
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all matches (full detail)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mr.M_ID, mr.Match_Date, mr.Compatibility_Score,
             o.Type AS Organ_Type, o.Blood_Group AS Organ_Blood,
             d.Name AS Donor_Name,
             r.Name AS Recipient_Name, r.Medical_Urgency_Score,
             h.Name AS Hospital_Name,
             COALESCE(s.Outcome, 'No Surgery Yet') AS Surgery_Outcome
      FROM Match_Record mr
      JOIN Organ o      ON mr.Organ_ID     = o.O_ID
      JOIN Donor d      ON o.Donor_ID      = d.D_ID
      JOIN Recipient r  ON mr.Recipient_ID = r.R_ID
      JOIN Hospital h   ON mr.Hospital_ID  = h.H_ID
      LEFT JOIN Surgery_Record s ON mr.M_ID = s.Match_ID
      ORDER BY mr.Match_Date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST find compatible matches for a recipient
router.post('/find', async (req, res) => {
  try {
    const { Recipient_ID } = req.body;

    // Get recipient info
    const [recipients] = await pool.query('SELECT * FROM Recipient WHERE R_ID = ?', [Recipient_ID]);
    if (recipients.length === 0) return res.status(404).json({ error: 'Recipient not found' });
    const recipient = recipients[0];

    // Find compatible available organs:
    // - Blood group matches
    // - Organ is Available
    // - Organ is not expired
    // - Donor has at least one Approved consent document
    const [organs] = await pool.query(`
      SELECT o.O_ID, o.Type, o.Blood_Group, o.Harvest_Time, o.Expiry_Time,
             d.D_ID AS Donor_ID, d.Name AS Donor_Name, d.Is_Alive
      FROM Organ o
      JOIN Donor d ON o.Donor_ID = d.D_ID
      WHERE o.Status = 'Available'
        AND o.Expiry_Time > NOW()
        AND o.Blood_Group = ?
        AND EXISTS (
          SELECT 1 FROM Consent_Document cd
          WHERE cd.Donor_ID = d.D_ID AND cd.Approval_Status = 'Approved'
        )
      ORDER BY o.Harvest_Time DESC
    `, [recipient.Blood_Group]);

    res.json({
      recipient,
      compatible_organs: organs,
      match_count: organs.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a match (allocate organ to recipient at hospital)
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { M_ID, Organ_ID, Recipient_ID, Hospital_ID, Compatibility_Score } = req.body;

    await conn.beginTransaction();

    // Verify organ is still available (with lock)
    const [organs] = await conn.query(
      'SELECT O_ID, Status, Donor_ID FROM Organ WHERE O_ID = ? AND Status = ? FOR UPDATE',
      [Organ_ID, 'Available']
    );
    if (organs.length === 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Organ is no longer available (may have been claimed by another hospital).' });
    }

    // Insert match record (trigger will set organ to 'Allocated')
    await conn.query(
      'INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID) VALUES (?, CURRENT_DATE, ?, ?, ?, ?)',
      [M_ID, Compatibility_Score || 85, Organ_ID, Recipient_ID, Hospital_ID]
    );

    // Link donor
    await conn.query(
      'INSERT INTO Provides_For (Donor_ID, Match_ID) VALUES (?, ?)',
      [organs[0].Donor_ID, M_ID]
    );

    await conn.commit();
    res.status(201).json({ message: 'Match created successfully!', M_ID });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
