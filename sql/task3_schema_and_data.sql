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
(101, 'Mayank Anand',        19, 'O+',  '9954213687', 'Delhi',       TRUE),
(102, 'Mayank Pratap Singh',  32, 'A+',  '8244758863', 'Indirapuram', TRUE),
(103, 'Aditya Garg',         58, 'B-',  '7855456632', 'Ghaziabad',   FALSE),
(104, 'Arjun Singh',         27, 'AB+', '8911672258', 'Bharatpur',   TRUE),
(105, 'Pranjal Gangwani',    20, 'O-',  '8860845217', 'Goa',         TRUE),
(106, 'Priya Sharma',        36, 'A+',  '6588954423', 'Jaipur',      TRUE),
(107, 'Mukesh Singh',        50, 'B+',  '7841236589', 'Jammu',       FALSE),
(108, 'Harshit Kumar',       39, 'O+',  '9622351174', 'Agra',        TRUE),
(109, 'Pranit Rajput',       50, 'AB-', '9511234478', 'Mumbai',      TRUE);

-- ---- Consent Documents ----
INSERT INTO Consent_Document (C_ID, Document_Type, Approval_Status, Upload_Date, Donor_ID) VALUES
(501, 'Kidney Donation',      'Approved', '2026-02-01', 101),
(502, 'Liver Donation',       'Approved', '2026-03-05', 102),
(503, 'Heart Donation',       'Approved', '2026-01-20', 103),
(504, 'Lung Donation',        'Rejected', '2026-03-28', 104),
(505, 'Kidney Donation',      'Approved', '2026-02-15', 105),
(506, 'Cornea Donation',      'Approved', '2026-03-01', 101),
(507, 'Liver Donation',       'Approved', '2026-03-10', 106),
(509, 'General Organ Pledge', 'Pending',  '2026-04-01', 104),
(510, 'Lung',                 'Approved', '2026-04-18', 109),
(512, 'Kidney Donation',      'Approved', '2026-03-20', 108);

-- ---- Organs ----
INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID) VALUES
(201, 'Kidney',   'O+',  '2026-02-12 02:30:00', '2026-02-12 14:30:00', 'Used',      101),
(202, 'Liver',    'A+',  '2026-04-07 04:30:00', '2026-06-01 04:30:00', 'Allocated', 102),
(203, 'Heart',    'B-',  '2026-04-06 08:30:00', '2026-06-01 08:30:00', 'Allocated', 103),
(204, 'Lung',     'AB+', '2026-04-05 03:30:00', '2026-06-01 03:30:00', 'Available', 104),
(205, 'Kidney',   'O-',  '2026-04-07 01:30:00', '2026-06-01 01:30:00', 'Available', 105),
(206, 'Cornea',   'O+',  '2026-04-06 05:30:00', '2026-06-01 05:30:00', 'Allocated', 101),
(207, 'Liver',    'A+',  '2026-04-08 00:30:00', '2026-06-01 00:30:00', 'Used',      106),
(208, 'Heart',    'B+',  '2026-04-03 06:30:00', '2026-06-01 06:30:00', 'Allocated', 107),
(209, 'Pancreas', 'O+',  '2026-03-01 02:30:00', '2026-06-01 02:30:00', 'Available', 101),
(210, 'Kidney',   'B+',  '2026-03-05 03:30:00', '2026-06-05 03:30:00', 'Available', 107),
(211, 'Kidney',   'O+',  '2026-04-10 01:30:00', '2026-07-01 01:30:00', 'Available', 108),
(212, 'Lung',     'AB-', '2026-04-17 14:58:00', '2026-04-30 14:58:00', 'Allocated', 109),
(213, 'Heart',    'AB+', '2026-04-14 08:03:00', '2026-04-16 08:03:00', 'Available', 104);

-- ---- Hospitals ----
INSERT INTO Hospital (H_ID, Name, Location, License_No, Is_Authorized) VALUES
(301, 'Central Health Hospital', 'Patpatganj, Delhi',          'LIC-990022', TRUE),
(302, 'Apollo Health Center',    'Dayalpur, Delhi',            'LIC-880033', TRUE),
(303, 'City General Hospital',   'Abhay Khand, Indirapuram',   'LIC-770044', TRUE),
(304, 'Sunrise Medical Center',  'Ghaziabad',                  'LIC-660055', FALSE),
(305, 'Delhi Medical Institute', 'Pitampura, Delhi',           'LIC-550066', TRUE),
(306, 'Max',                     'Vaishali',                   'LIC-550206', TRUE);

-- ---- Recipients ----
INSERT INTO Recipient (R_ID, Name, Age, Blood_Group, Medical_Urgency_Score, Registration_Date) VALUES
(401, 'Aashish Singh',    38, 'O+',  85, '2026-01-15'),
(402, 'Parth Singh',      52, 'A+',  92, '2026-02-10'),
(403, 'Shashank',         29, 'B-',  78, '2026-03-01'),
(404, 'Avdhesh Rajput',   61, 'O-',  95, '2025-12-20'),
(405, 'Ankit Kumar',      44, 'AB+', 65, '2026-03-15'),
(406, 'Bhanu Pal Singh',  33, 'O+',  91, '2026-01-28'),
(407, 'Ananya Patel',     25, 'A+',  88, '2026-02-22'),
(408, 'Wasip',            47, 'B+',  72, '2026-03-10'),
(409, 'Piyush Singh',     55, 'AB-', 99, '2026-04-18');

-- ---- Match Records ----
INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID) VALUES
(701,  '2026-02-12', 92, 201, 401, 301),
(702,  '2026-03-15', 90, 207, 402, 302),
(703,  '2026-03-20', 88, 208, 408, 303),
(1418, '2026-04-18', 95, 212, 409, 306),
(1562, '2026-04-18', 88, 203, 404, 301),
(1564, '2026-04-18', 88, 206, 403, 301),
(1565, '2026-04-18', 88, 202, 402, 301);

-- ---- Surgery Records ----
INSERT INTO Surgery_Record (S_ID, Surgery_Date, Outcome, Match_ID) VALUES
(752, '2026-04-19', 'Complications', 1562),
(801, '2026-02-13', 'Successful',    701),
(802, '2026-03-16', 'Successful',    702),
(803, '2026-03-21', 'Scheduled',     703),
(999, '2026-04-19', 'Failed',        1418);

-- ---- Provides_For (Donor-to-Match link) ----
INSERT INTO Provides_For (Donor_ID, Match_ID) VALUES
(101, 701),
(106, 702),
(107, 703),
(109, 1418),
(103, 1562),
(101, 1564),
(102, 1565);
