// routes/queries.js — Run the 15 Task-4 Queries from the UI
const express = require('express');
const router = express.Router();
const pool = require('../db');

// The 15 queries from Task 4, each with metadata
const QUERIES = [
  {
    id: 1,
    title: 'Donors with Blood Group O+',
    category: 'Basic Retrieval',
    description: 'Blood group O+ is a universal donor for Rh-positive recipients. Hospital coordinators filter donors by blood group to identify potential matches.',
    sql: `SELECT D_ID, Name, Age, Blood_group, City, Is_Alive FROM Donor WHERE Blood_group = 'O+'`
  },
  {
    id: 2,
    title: 'All Currently Available Organs',
    category: 'Basic Retrieval',
    description: 'Real-time view of which organs are available in the registry so they can be matched without delay.',
    sql: `SELECT O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Donor_ID FROM Organ WHERE Status = 'Available'`
  },
  {
    id: 3,
    title: 'Recipients by Medical Urgency',
    category: 'Sorting',
    description: 'Prioritize patients whose medical condition is most critical, enabling fair, life-saving allocation decisions.',
    sql: `SELECT R_ID, Name, Age, Blood_Group, Medical_Urgency_Score FROM Recipient ORDER BY Medical_Urgency_Score DESC`
  },
  {
    id: 4,
    title: 'Organs Donated Per Donor',
    category: 'Aggregation',
    description: 'Track how many organs each donor has contributed — helps identify multi-organ donors (e.g., deceased donors).',
    sql: `SELECT d.D_ID, d.Name, COUNT(o.O_ID) AS Organs_Donated FROM Donor d LEFT JOIN Organ o ON d.D_ID = o.Donor_ID GROUP BY d.D_ID, d.Name ORDER BY Organs_Donated DESC`
  },
  {
    id: 5,
    title: 'Average Compatibility Score',
    category: 'Aggregation',
    description: 'Quality assurance monitors the average compatibility score to evaluate the matching algorithm\'s effectiveness.',
    sql: `SELECT ROUND(AVG(Compatibility_Score), 2) AS Avg_Compatibility FROM Match_Record`
  },
  {
    id: 6,
    title: 'Hospitals Ranked by Successful Surgeries',
    category: 'Aggregation + JOIN',
    description: 'Evaluate which hospitals have the best transplant track record for regulatory oversight.',
    sql: `SELECT h.H_ID, h.Name AS Hospital_Name, COUNT(s.S_ID) AS Successful_Surgeries FROM Hospital h JOIN Match_Record mr ON h.H_ID = mr.Hospital_ID JOIN Surgery_Record s ON mr.M_ID = s.Match_ID WHERE s.Outcome = 'Successful' GROUP BY h.H_ID, h.Name ORDER BY Successful_Surgeries DESC`
  },
  {
    id: 7,
    title: 'Organs with Donor Details',
    category: 'JOIN (2-table)',
    description: 'See who each organ\'s donor is and their alive status, affecting handling procedures and consent.',
    sql: `SELECT o.O_ID, o.Type, o.Blood_Group, o.Status, d.Name AS Donor_Name, d.Is_Alive FROM Organ o JOIN Donor d ON o.Donor_ID = d.D_ID`
  },
  {
    id: 8,
    title: 'Match Records with Recipient Info',
    category: 'JOIN (2-table)',
    description: 'Consolidated view of all matches showing which recipient was chosen and their compatibility score.',
    sql: `SELECT mr.M_ID, mr.Match_Date, mr.Compatibility_Score, r.Name AS Recipient_Name, r.Medical_Urgency_Score FROM Match_Record mr JOIN Recipient r ON mr.Recipient_ID = r.R_ID`
  },
  {
    id: 9,
    title: 'Full Match Chain of Custody',
    category: 'JOIN (4-table)',
    description: 'Complete chain-of-custody report: organ, donor, recipient, and performing hospital for each match.',
    sql: `SELECT mr.M_ID, o.Type AS Organ_Type, o.Blood_Group AS Organ_Blood, d.Name AS Donor_Name, r.Name AS Recipient_Name, h.Name AS Hospital_Name, mr.Compatibility_Score, mr.Match_Date FROM Match_Record mr JOIN Organ o ON mr.Organ_ID = o.O_ID JOIN Donor d ON o.Donor_ID = d.D_ID JOIN Recipient r ON mr.Recipient_ID = r.R_ID JOIN Hospital h ON mr.Hospital_ID = h.H_ID`
  },
  {
    id: 10,
    title: 'Ready-to-Allocate Organs (Living Donor + Approved Consent)',
    category: 'JOIN (3-table) + Filter',
    description: 'Organs that are available, from living donors, with fully approved consent — the "ready-to-go" list.',
    sql: `SELECT o.O_ID, o.Type, o.Blood_Group, d.Name AS Donor_Name, cd.Approval_Status FROM Organ o JOIN Donor d ON o.Donor_ID = d.D_ID JOIN Consent_Document cd ON d.D_ID = cd.Donor_ID WHERE o.Status = 'Available' AND d.Is_Alive = TRUE AND cd.Approval_Status = 'Approved'`
  },
  {
    id: 11,
    title: 'Above-Average Urgency Recipients',
    category: 'Subquery',
    description: 'Identify patients significantly more critical than average for expedited matching and priority organ offers.',
    sql: `SELECT R_ID, Name, Blood_Group, Medical_Urgency_Score FROM Recipient WHERE Medical_Urgency_Score > (SELECT AVG(Medical_Urgency_Score) FROM Recipient) ORDER BY Medical_Urgency_Score DESC`
  },
  {
    id: 12,
    title: 'Donors with Approved Consent',
    category: 'Subquery (EXISTS)',
    description: 'Only donors with legally approved consent can participate in organ matching.',
    sql: `SELECT d.D_ID, d.Name, d.Blood_group, d.City FROM Donor d WHERE EXISTS (SELECT 1 FROM Consent_Document cd WHERE cd.Donor_ID = d.D_ID AND cd.Approval_Status = 'Approved')`
  },
  {
    id: 13,
    title: 'Recipient Match Status',
    category: 'Correlated Subquery',
    description: 'Quick snapshot of every recipient\'s current match status — waiting or already matched.',
    sql: `SELECT r.R_ID, r.Name, r.Blood_Group, r.Medical_Urgency_Score, CASE WHEN EXISTS (SELECT 1 FROM Match_Record mr WHERE mr.Recipient_ID = r.R_ID) THEN 'Matched' ELSE 'Waiting' END AS Match_Status FROM Recipient r ORDER BY r.Medical_Urgency_Score DESC`
  },
  {
    id: 14,
    title: 'Mark Organs as Used After Successful Surgery',
    category: 'DML — UPDATE',
    description: 'After a successful transplant, the organ is marked "Used" to remove it from active inventory.',
    sql: `UPDATE Organ o JOIN Match_Record mr ON o.O_ID = mr.Organ_ID JOIN Surgery_Record s ON mr.M_ID = s.Match_ID SET o.Status = 'Used' WHERE s.Outcome = 'Successful' AND o.Status = 'Allocated'`
  },
  {
    id: 15,
    title: 'Purge Old Rejected Consent Documents',
    category: 'DML — DELETE',
    description: 'Data hygiene: remove consent documents rejected more than 1 year ago for compliance.',
    sql: `DELETE FROM Consent_Document WHERE Approval_Status = 'Rejected' AND Upload_Date < DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR)`
  }
];

// GET list of available queries (metadata only)
router.get('/', (req, res) => {
  res.json(QUERIES.map(q => ({ id: q.id, title: q.title, category: q.category, description: q.description })));
});

// GET run a specific query by ID
router.get('/run/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const query = QUERIES.find(q => q.id === queryId);
    if (!query) return res.status(404).json({ error: 'Query not found' });

    const [rows] = await pool.query(query.sql);
    res.json({
      query: {
        id: query.id,
        title: query.title,
        category: query.category,
        description: query.description,
        sql: query.sql
      },
      results: rows,
      rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows ?? 0),
      isModification: queryId >= 14
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
