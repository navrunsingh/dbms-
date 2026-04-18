-- ============================================================================
-- TASK 3: DATABASE SCHEMA & SEED DATA
-- Organ Donation & Transplant Matching System
-- ============================================================================

DROP DATABASE IF EXISTS OrganTransplantDB;
CREATE DATABASE OrganTransplantDB;
USE OrganTransplantDB;

-- --------------------------------------------------------------------------
-- TABLE DEFINITIONS
-- --------------------------------------------------------------------------

CREATE TABLE Donor (
    D_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Age INT CHECK (Age >= 0),
    Blood_group VARCHAR(5),
    Contact_no VARCHAR(15),
    City VARCHAR(50),
    Is_Alive BOOLEAN DEFAULT TRUE
);

CREATE TABLE Recipient (
    R_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Age INT NOT NULL,
    Blood_Group VARCHAR(5),
    Medical_Urgency_Score INT CHECK (Medical_Urgency_Score BETWEEN 0 AND 100),
    Registration_Date DATE DEFAULT (CURRENT_DATE),
    CHECK (Age >= 0)
);

CREATE TABLE Hospital (
    H_ID INT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(255),
    License_No VARCHAR(50) UNIQUE NOT NULL,
    Is_Authorized BOOLEAN DEFAULT FALSE
);

CREATE TABLE Organ (
    O_ID INT PRIMARY KEY,
    Type VARCHAR(50) NOT NULL,
    Blood_Group VARCHAR(5),
    Harvest_Time TIMESTAMP,
    Expiry_Time TIMESTAMP,
    Status VARCHAR(20) CHECK (Status IN ('Available', 'Allocated', 'Used')),
    Donor_ID INT,
    CONSTRAINT chk_expiry_time CHECK (Expiry_Time > Harvest_Time),
    FOREIGN KEY (Donor_ID) REFERENCES Donor(D_ID)
);

CREATE TABLE Consent_Document (
    C_ID INT PRIMARY KEY,
    Document_Type VARCHAR(50),
    Approval_Status VARCHAR(20) DEFAULT 'Pending',
    Upload_Date DATE,
    Donor_ID INT NOT NULL,
    CHECK (Approval_Status IN ('Approved', 'Pending', 'Rejected')),
    FOREIGN KEY (Donor_ID) REFERENCES Donor(D_ID) ON DELETE CASCADE
);

CREATE TABLE Match_Record (
    M_ID INT PRIMARY KEY,
    Match_Date DATE NOT NULL,
    Compatibility_Score INT CHECK (Compatibility_Score BETWEEN 0 AND 100),
    Organ_ID INT UNIQUE,
    Recipient_ID INT,
    Hospital_ID INT,
    FOREIGN KEY (Organ_ID) REFERENCES Organ(O_ID),
    FOREIGN KEY (Recipient_ID) REFERENCES Recipient(R_ID),
    FOREIGN KEY (Hospital_ID) REFERENCES Hospital(H_ID)
);

CREATE TABLE Surgery_Record (
    S_ID INT PRIMARY KEY,
    Surgery_Date DATE,
    Outcome VARCHAR(100),
    Match_ID INT UNIQUE,
    FOREIGN KEY (Match_ID) REFERENCES Match_Record(M_ID)
);

CREATE TABLE Provides_For (
    Donor_ID INT,
    Match_ID INT,
    PRIMARY KEY (Donor_ID, Match_ID),
    FOREIGN KEY (Donor_ID) REFERENCES Donor(D_ID),
    FOREIGN KEY (Match_ID) REFERENCES Match_Record(M_ID)
);

-- --------------------------------------------------------------------------
-- INDEXES
-- --------------------------------------------------------------------------

-- Unique constraint for Hospital License (already defined in table, but good to explicitize)
CREATE UNIQUE INDEX idx_hospital_license ON Hospital(License_No);
-- Index for searching compatible blood groups (common query)
CREATE INDEX idx_organ_blood ON Organ(Blood_Group);
CREATE INDEX idx_recipient_blood ON Recipient(Blood_Group);
-- Index for high-urgency recipients
CREATE INDEX idx_medical_urgency ON Recipient(Medical_Urgency_Score DESC);
-- Index for matching donor to matches
CREATE INDEX idx_provides_donor ON Provides_For(Donor_ID);

-- --------------------------------------------------------------------------
-- SEED DATA — Expanded for demo purposes
-- --------------------------------------------------------------------------

-- ---- Donors ----
INSERT INTO Donor (D_ID, Name, Age, Blood_group, Contact_no, City, Is_Alive) VALUES
(101, 'John Doe',       45, 'O+',  '555-0199', 'New York',    TRUE),
(102, 'Emily Davis',    32, 'A+',  '555-0234', 'Los Angeles', TRUE),
(103, 'Robert Brown',   58, 'B-',  '555-0345', 'Chicago',     FALSE),
(104, 'Sarah Wilson',   27, 'AB+', '555-0456', 'Houston',     TRUE),
(105, 'Michael Chen',   41, 'O-',  '555-0567', 'Boston',      TRUE),
(106, 'Priya Sharma',   36, 'A+',  '555-0678', 'San Francisco', TRUE),
(107, 'Carlos Martinez',50, 'B+',  '555-0789', 'Miami',       FALSE);

-- ---- Consent Documents ----
INSERT INTO Consent_Document (C_ID, Document_Type, Approval_Status, Upload_Date, Donor_ID) VALUES
(501, 'Kidney Donation',     'Approved',  '2026-02-01', 101),
(502, 'Liver Donation',      'Approved',  '2026-03-05', 102),
(503, 'Heart Donation',      'Approved',  '2026-01-20', 103),
(504, 'Lung Donation',       'Pending',   '2026-03-28', 104),
(505, 'Kidney Donation',     'Approved',  '2026-02-15', 105),
(506, 'Cornea Donation',     'Approved',  '2026-03-01', 101),
(507, 'Liver Donation',      'Approved',  '2026-03-10', 106),
(508, 'Heart Donation',      'Rejected',  '2024-11-01', 107),
(509, 'General Organ Pledge','Pending',   '2026-04-01', 104);

-- ---- Organs ----
-- Organ 201: Already allocated (from original data)
INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES
(201, 'Kidney',  'O+',  '2026-02-12 08:00:00', '2026-02-12 20:00:00', 'Allocated', 101),
(202, 'Liver',   'A+',  '2026-04-07 10:00:00', '2026-06-01 10:00:00', 'Available', 102),
(203, 'Heart',   'B-',  '2026-04-06 14:00:00', '2026-06-01 14:00:00', 'Available', 103),
(204, 'Lung',    'AB+', '2026-04-05 09:00:00', '2026-06-01 09:00:00', 'Available', 104),
(205, 'Kidney',  'O-',  '2026-04-07 07:00:00', '2026-06-01 07:00:00', 'Available', 105),
(206, 'Cornea',  'O+',  '2026-04-06 11:00:00', '2026-06-01 11:00:00', 'Available', 101),
(207, 'Liver',   'A+',  '2026-04-08 06:00:00', '2026-06-01 06:00:00', 'Available', 106),
(208, 'Heart',   'B+',  '2026-04-03 12:00:00', '2026-06-01 12:00:00', 'Available', 107);

-- ---- Hospitals ----
INSERT INTO Hospital (H_ID, Name, Location, License_No, Is_Authorized) VALUES
(301, 'Central Health Hospital',  'Building A, NYC',           'LIC-990022', TRUE),
(302, 'Apollo Health Center',     '500 Sunset Blvd, LA',       'LIC-880033', TRUE),
(303, 'City General Hospital',    '200 Lake Shore Dr, Chicago', 'LIC-770044', TRUE),
(304, 'Sunrise Medical Center',   '100 Main St, Houston',      'LIC-660055', FALSE),
(305, 'Boston Medical Institute',  '75 Francis St, Boston',     'LIC-550066', TRUE);

-- ---- Recipients ----
INSERT INTO Recipient (R_ID, Name, Age, Blood_Group, Medical_Urgency_Score, Registration_Date) VALUES
(401, 'Jane Smith',     38, 'O+',  85, '2026-01-15'),
(402, 'David Lee',      52, 'A+',  92, '2026-02-10'),
(403, 'Maria Garcia',   29, 'B-',  78, '2026-03-01'),
(404, 'Thomas Wright',  61, 'O-',  95, '2025-12-20'),
(405, 'Lisa Johnson',   44, 'AB+', 65, '2026-03-15'),
(406, 'James Brown',    33, 'O+',  91, '2026-01-28'),
(407, 'Ananya Patel',   25, 'A+',  88, '2026-02-22'),
(408, 'Wei Zhang',      47, 'B+',  72, '2026-03-10');

-- ---- Match Records ----
-- M701: Kidney to Jane Smith at Central Health (already existed)
-- M702: Liver to David Lee at Apollo Health Center
-- M703: Heart to Maria Garcia at City General Hospital
INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID) VALUES
(701, '2026-02-12', 92, 201, 401, 301),
(702, '2026-03-15', 90, 207, 402, 302),
(703, '2026-03-20', 88, 208, 408, 303);

-- ---- Surgery Records ----
-- 2 Successful surgeries (needed for Q6: hospitals ranked by successful surgeries)
-- 1 Scheduled surgery (needed for variety)
INSERT INTO Surgery_Record (S_ID, Surgery_Date, Outcome, Match_ID) VALUES
(801, '2026-02-13', 'Successful', 701),
(802, '2026-03-16', 'Successful', 702),
(803, '2026-03-21', 'Scheduled',  703);

-- ---- Provides_For (Donor-to-Match link) ----
INSERT INTO Provides_For (Donor_ID, Match_ID) VALUES
(101, 701),
(106, 702),
(107, 703);

-- ---- Extra organ for Q4 (multi-organ donors need >=2 donors with >=2 organs each) ----
-- Organ 209: 2nd organ from Donor 101 (John Doe already has organ 201 + 206)
-- Organ 210: 2nd organ from Donor 107 (Carlos Martinez already has organ 208 + 210)
INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES
(209, 'Pancreas', 'O+', '2026-03-01 08:00:00', '2026-06-01 08:00:00', 'Available', 101),
(210, 'Kidney',   'B+', '2026-03-05 09:00:00', '2026-06-05 09:00:00', 'Available', 107);

-- ---- Extra O+ donor for Q1 (needs >=2 O+ donors) ----
INSERT INTO Donor (D_ID, Name, Age, Blood_group, Contact_no, City, Is_Alive) VALUES
(108, 'Linda Park', 39, 'O+', '555-0891', 'Seattle', TRUE);

INSERT INTO Consent_Document (C_ID, Document_Type, Approval_Status, Upload_Date, Donor_ID) VALUES
(512, 'Kidney Donation', 'Approved', '2026-03-20', 108);

INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES
(211, 'Kidney', 'O+', '2026-04-10 07:00:00', '2026-07-01 07:00:00', 'Available', 108);

-- ---- Old Rejected Consent Documents for Q15 (older than 1 year) ----
INSERT INTO Consent_Document (C_ID, Document_Type, Approval_Status, Upload_Date, Donor_ID) VALUES
(510, 'Kidney Donation', 'Rejected', '2024-12-01', 107),
(511, 'Liver Donation',  'Rejected', '2024-10-15', 104);

-- NOTE: Organs 201 & 207 are Allocated (matched). Q14 marks them Used after Successful surgery.
-- The UPDATE in Q14 runs live in the UI, so we leave them as 'Allocated' here.
-- (If already Used from a previous run, Q14 will show 0 affected — that's also correct.)


