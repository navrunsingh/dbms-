-- ============================================================================
-- TASK 4: 15 SQL QUERIES OF VARYING COMPLEXITY
-- Organ Donation & Transplant Matching System
-- ============================================================================
USE OrganTransplantDB;

-- ============================================================================
-- SECTION A: BASIC RETRIEVAL (Queries 1–2)
-- ============================================================================

-- --------------------------------------------------------------------------
-- QUERY 1: List all donors with blood group O+
-- Business Use-Case: Blood group O+ is a universal donor for Rh-positive
-- recipients. Hospital coordinators frequently need to filter donors by
-- blood group to identify potential matches quickly.
-- Complexity: Basic SELECT with WHERE clause
-- --------------------------------------------------------------------------
SELECT D_ID, Name, Age, Blood_group, City, Is_Alive
FROM Donor
WHERE Blood_group = 'O+';

-- --------------------------------------------------------------------------
-- QUERY 2: List all currently available organs
-- Business Use-Case: The organ procurement team needs a real-time view of
-- which organs are available in the registry so they can be matched to
-- recipients on the waitlist without delay.
-- Complexity: Basic SELECT with WHERE clause
-- --------------------------------------------------------------------------
SELECT O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Donor_ID
FROM Organ
WHERE Status = 'Available';


-- ============================================================================
-- SECTION B: SORTING & AGGREGATION (Queries 3–6)
-- ============================================================================

-- --------------------------------------------------------------------------
-- QUERY 3: List recipients ordered by medical urgency (highest first)
-- Business Use-Case: The allocation committee must prioritize patients
-- whose medical condition is most critical. This query provides the
-- waiting list sorted by urgency, enabling fair, life-saving decisions.
-- Complexity: SELECT with ORDER BY
-- --------------------------------------------------------------------------
SELECT R_ID, Name, Age, Blood_Group, Medical_Urgency_Score
FROM Recipient
ORDER BY Medical_Urgency_Score DESC;

-- --------------------------------------------------------------------------
-- QUERY 4: Count the number of organs donated per donor
-- Business Use-Case: Tracking how many organs each donor has contributed
-- helps coordinators recognize multi-organ donors (e.g., deceased donors
-- who may donate several organs simultaneously).
-- Complexity: Aggregation with GROUP BY
-- --------------------------------------------------------------------------
SELECT d.D_ID, d.Name, COUNT(o.O_ID) AS Organs_Donated
FROM Donor d
LEFT JOIN Organ o ON d.D_ID = o.Donor_ID
GROUP BY d.D_ID, d.Name
ORDER BY Organs_Donated DESC;

-- --------------------------------------------------------------------------
-- QUERY 5: Average compatibility score of completed matches
-- Business Use-Case: The quality assurance team monitors the average
-- compatibility score across all matches to evaluate the effectiveness
-- of the matching algorithm and ensure patient safety standards.
-- Complexity: Aggregation with AVG
-- --------------------------------------------------------------------------
SELECT ROUND(AVG(Compatibility_Score), 2) AS Avg_Compatibility
FROM Match_Record;

-- --------------------------------------------------------------------------
-- QUERY 6: Hospitals ranked by number of successful surgeries
-- Business Use-Case: Regulatory bodies and patients need to evaluate
-- which hospitals have the best track record for transplant surgeries.
-- Hospitals with zero or few successes may need additional oversight.
-- Complexity: Multi-table JOIN with aggregation, HAVING filter
-- --------------------------------------------------------------------------
SELECT h.H_ID, h.Name AS Hospital_Name, COUNT(s.S_ID) AS Successful_Surgeries
FROM Hospital h
JOIN Match_Record mr ON h.H_ID = mr.Hospital_ID
JOIN Surgery_Record s ON mr.M_ID = s.Match_ID
WHERE s.Outcome = 'Successful'
GROUP BY h.H_ID, h.Name
ORDER BY Successful_Surgeries DESC;


-- ============================================================================
-- SECTION C: MULTI-TABLE JOINs (Queries 7–10)
-- ============================================================================

-- --------------------------------------------------------------------------
-- QUERY 7: List each organ along with its donor's name and alive status
-- Business Use-Case: When reviewing the organ inventory, staff needs to
-- see who the donor is and whether they are a living or deceased donor,
-- as this affects handling procedures and consent requirements.
-- Complexity: 2-table INNER JOIN
-- --------------------------------------------------------------------------
SELECT o.O_ID, o.Type, o.Blood_Group, o.Status,
       d.Name AS Donor_Name, d.Is_Alive
FROM Organ o
JOIN Donor d ON o.Donor_ID = d.D_ID;

-- --------------------------------------------------------------------------
-- QUERY 8: Show all match records with recipient names and scores
-- Business Use-Case: The transplant coordinator needs a consolidated view
-- of all matches showing which recipient was chosen and their compatibility
-- score, to audit the fairness of past allocation decisions.
-- Complexity: 2-table JOIN
-- --------------------------------------------------------------------------
SELECT mr.M_ID, mr.Match_Date, mr.Compatibility_Score,
       r.Name AS Recipient_Name, r.Medical_Urgency_Score
FROM Match_Record mr
JOIN Recipient r ON mr.Recipient_ID = r.R_ID;

-- --------------------------------------------------------------------------
-- QUERY 9: Full match detail — organ type, donor, recipient, hospital
-- Business Use-Case: For regulatory reporting and transparency, a complete
-- "chain of custody" report is required showing every entity involved in
-- each transplant match — the organ, the donor, the recipient, and the
-- performing hospital.
-- Complexity: 4-table JOIN
-- --------------------------------------------------------------------------
SELECT mr.M_ID,
       o.Type        AS Organ_Type,
       o.Blood_Group AS Organ_Blood,
       d.Name        AS Donor_Name,
       r.Name        AS Recipient_Name,
       h.Name        AS Hospital_Name,
       mr.Compatibility_Score,
       mr.Match_Date
FROM Match_Record mr
JOIN Organ o      ON mr.Organ_ID     = o.O_ID
JOIN Donor d      ON o.Donor_ID      = d.D_ID
JOIN Recipient r  ON mr.Recipient_ID = r.R_ID
JOIN Hospital h   ON mr.Hospital_ID  = h.H_ID;

-- --------------------------------------------------------------------------
-- QUERY 10: Available organs from living donors with approved consent
-- Business Use-Case: Before any organ can be legally allocated, the donor
-- must be verified as having approved consent. This query joins three
-- tables to produce a "ready-to-allocate" list — organs that are available,
-- from living donors, and fully consented.
-- Complexity: 3-table JOIN with multiple WHERE filters
-- --------------------------------------------------------------------------
SELECT o.O_ID, o.Type, o.Blood_Group,
       d.Name AS Donor_Name,
       cd.Approval_Status
FROM Organ o
JOIN Donor d             ON o.Donor_ID  = d.D_ID
JOIN Consent_Document cd ON d.D_ID      = cd.Donor_ID
WHERE o.Status = 'Available'
  AND d.Is_Alive = TRUE
  AND cd.Approval_Status = 'Approved';


-- ============================================================================
-- SECTION D: SUBQUERIES (Queries 11–13)
-- ============================================================================

-- --------------------------------------------------------------------------
-- QUERY 11: Recipients whose urgency score is above the overall average
-- Business Use-Case: The medical board wants to identify patients who are
-- significantly more critical than the average waitlisted patient, so
-- they can receive expedited matching and priority organ offers.
-- Complexity: Subquery in WHERE clause
-- --------------------------------------------------------------------------
SELECT R_ID, Name, Blood_Group, Medical_Urgency_Score
FROM Recipient
WHERE Medical_Urgency_Score > (
    SELECT AVG(Medical_Urgency_Score) FROM Recipient
)
ORDER BY Medical_Urgency_Score DESC;

-- --------------------------------------------------------------------------
-- QUERY 12: Donors who have at least one approved consent document
-- Business Use-Case: Only donors with legally approved consent can
-- participate in the organ matching process. This query filters out
-- any donor whose paperwork is still pending or was rejected.
-- Complexity: Subquery with EXISTS
-- --------------------------------------------------------------------------
SELECT d.D_ID, d.Name, d.Blood_group, d.City
FROM Donor d
WHERE EXISTS (
    SELECT 1
    FROM Consent_Document cd
    WHERE cd.Donor_ID = d.D_ID
      AND cd.Approval_Status = 'Approved'
);

-- --------------------------------------------------------------------------
-- QUERY 13: For each recipient, show whether they have been matched
-- Business Use-Case: The waitlist manager needs a quick snapshot of every
-- recipient alongside their current match status — whether they are still
-- waiting or have already been assigned an organ.
-- Complexity: Correlated subquery / LEFT JOIN with CASE
-- --------------------------------------------------------------------------
SELECT r.R_ID, r.Name, r.Blood_Group, r.Medical_Urgency_Score,
       CASE
           WHEN EXISTS (
               SELECT 1 FROM Match_Record mr WHERE mr.Recipient_ID = r.R_ID
           ) THEN 'Matched'
           ELSE 'Waiting'
       END AS Match_Status
FROM Recipient r
ORDER BY r.Medical_Urgency_Score DESC;


-- ============================================================================
-- SECTION E: DML UPDATES & DELETES (Queries 14–15)
-- ============================================================================

-- --------------------------------------------------------------------------
-- QUERY 14: Remove rejected consent documents older than 1 year
-- Business Use-Case: For data hygiene and GDPR-like compliance, the system
-- periodically purges consent documents that were rejected more than one
-- year ago, as they are no longer legally relevant and consume storage.
-- Complexity: DML DELETE with date arithmetic
-- --------------------------------------------------------------------------
DELETE FROM Consent_Document
WHERE Approval_Status = 'Rejected'
  AND Upload_Date < DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR);

-- --------------------------------------------------------------------------
-- QUERY 15: Expired Organs Report
-- Business Use-Case: Lists all organs whose Expiry_Time has already passed,
-- along with the donor name, current status, and exactly how many hours
-- ago they expired. Critical for data hygiene and audit purposes.
-- Complexity: Basic Retrieval + Date Math Filtering
-- --------------------------------------------------------------------------
SELECT o.O_ID, o.Type, o.Blood_Group, o.Status, d.Name AS Donor_Name, o.Expiry_Time, 
       ROUND(TIMESTAMPDIFF(MINUTE, o.Expiry_Time, NOW()) / 60, 1) AS Hours_Expired 
FROM Organ o 
JOIN Donor d ON o.Donor_ID = d.D_ID 
WHERE o.Expiry_Time < NOW() 
ORDER BY o.Expiry_Time ASC;
