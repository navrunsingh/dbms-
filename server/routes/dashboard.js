// routes/dashboard.js — Command Center Stats & Urgency Alerts
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [[donors]] = await pool.query('SELECT COUNT(*) AS count FROM Donor WHERE Is_Alive = TRUE');
    const [[totalDonors]] = await pool.query('SELECT COUNT(*) AS count FROM Donor');
    const [[recipients]] = await pool.query('SELECT COUNT(*) AS count FROM Recipient');
    const [[availableOrgans]] = await pool.query("SELECT COUNT(*) AS count FROM Organ WHERE Status = 'Available' AND Expiry_Time > NOW()");
    const [[totalOrgans]] = await pool.query('SELECT COUNT(*) AS count FROM Organ');
    const [[matches]] = await pool.query('SELECT COUNT(*) AS count FROM Match_Record');
    const [[surgeries]] = await pool.query("SELECT COUNT(*) AS count FROM Surgery_Record WHERE Outcome = 'Successful'");
    const [[hospitals]] = await pool.query('SELECT COUNT(*) AS count FROM Hospital WHERE Is_Authorized = TRUE');
    const [[pendingConsent]] = await pool.query("SELECT COUNT(*) AS count FROM Consent_Document WHERE Approval_Status = 'Pending'");

    res.json({
      activeDonors: donors.count,
      totalDonors: totalDonors.count,
      recipientsWaiting: recipients.count,
      availableOrgans: availableOrgans.count,
      totalOrgans: totalOrgans.count,
      totalMatches: matches.count,
      successfulSurgeries: surgeries.count,
      authorizedHospitals: hospitals.count,
      pendingConsent: pendingConsent.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET urgency alerts (patients with score > 90)
router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.R_ID, r.Name, r.Blood_Group, r.Medical_Urgency_Score, r.Registration_Date,
             CASE
               WHEN EXISTS (SELECT 1 FROM Match_Record mr WHERE mr.Recipient_ID = r.R_ID)
               THEN 'Matched'
               ELSE 'Waiting'
             END AS Status
      FROM Recipient r
      WHERE r.Medical_Urgency_Score > 90
      ORDER BY r.Medical_Urgency_Score DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
