-- ============================================================================
-- TASK 6: TRANSACTIONS — Commit, Rollback & Conflict Demonstration
-- Organ Donation & Transplant Matching System
-- ============================================================================
USE OrganTransplantDB;

-- ============================================================================
-- SCENARIO 1: Successful Organ Allocation (COMMIT)
-- ============================================================================
-- Business Context:
-- A matching coordinator identifies that Organ 202 (Liver, A+) is compatible
-- with Recipient 402 (David Lee, A+, urgency 92). The transplant will take
-- place at Apollo Health Center (H_ID 302). This transaction performs all
-- steps atomically: create the match record, link the donor, and schedule
-- the surgery. If every step succeeds, the entire operation is committed.
-- --------------------------------------------------------------------------

START TRANSACTION;

-- Step 1: Create the match record
INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID)
VALUES (702, CURRENT_DATE, 90, 202, 402, 302);
-- Note: The AFTER INSERT trigger (Update_Organ_Status_After_Match) will
-- automatically set Organ 202's status from 'Available' to 'Allocated'.

-- Step 2: Link the donor to this match via the junction table
INSERT INTO Provides_For (Donor_ID, Match_ID)
VALUES (102, 702);

-- Step 3: Schedule the surgery for the following day
INSERT INTO Surgery_Record (S_ID, Surgery_Date, Outcome, Match_ID)
VALUES (802, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'Scheduled', 702);

-- Everything succeeded — make changes permanent
COMMIT;

-- Verification: the organ should now be 'Allocated'
SELECT O_ID, Type, Status FROM Organ WHERE O_ID = 202;
-- Expected: Status = 'Allocated'


-- ============================================================================
-- SCENARIO 2: Rollback on Error (Expired Organ)
-- ============================================================================
-- Business Context:
-- A coordinator mistakenly tries to allocate an organ that has already
-- expired. The BEFORE INSERT trigger (Prevent_Expired_Organ_Match) will
-- raise an error, and the transaction should be rolled back so that no
-- partial data is left behind.
--
-- To demonstrate, we temporarily insert an expired organ, attempt to match
-- it, then clean up.
-- --------------------------------------------------------------------------

-- Insert a test expired organ (expired yesterday)
INSERT INTO Organ (O_ID, Type, Blood_Group, Harvest_Time, Expiry_Time, Status, Donor_ID)
VALUES (299, 'Test Kidney', 'A+', '2026-01-01 08:00:00', '2026-01-01 20:00:00', 'Available', 102);

START TRANSACTION;

-- This INSERT will be blocked by the Prevent_Expired_Organ_Match trigger
-- because Expiry_Time (2026-01-01 20:00) < CURRENT_TIMESTAMP.
-- ERROR 1644 (45000): Organ has expired and cannot be matched.
-- INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID)
-- VALUES (799, CURRENT_DATE, 85, 299, 402, 302);

-- Since the trigger raised SQLSTATE 45000, the statement fails.
-- We explicitly roll back to ensure no partial state.
ROLLBACK;

-- Clean up the test organ
DELETE FROM Organ WHERE O_ID = 299;

-- Verification: no match 799 should exist
SELECT * FROM Match_Record WHERE M_ID = 799;
-- Expected: Empty result set


-- ============================================================================
-- SCENARIO 3: Conflicting Transactions — Two Hospitals Claim Same Organ
-- ============================================================================
-- Business Context:
-- This is the critical concurrency scenario. Organ 203 (Heart, B-) is
-- 'Available'. Two hospitals — Apollo Health Center (302) and City General
-- Hospital (303) — both attempt to allocate this organ to their respective
-- recipients at the exact same time.
--
-- Without proper locking, both transactions might read Status = 'Available'
-- and both would proceed, resulting in a DOUBLE ALLOCATION — a catastrophic
-- error in organ transplant systems.
--
-- MySQL InnoDB handles this using **row-level locking** with
-- SELECT ... FOR UPDATE. The first transaction to acquire the lock proceeds;
-- the second transaction blocks until the first commits or rolls back.
-- --------------------------------------------------------------------------

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONNECTION A (Apollo Health Center — Hospital 302)                     ║
-- ║  Trying to allocate Organ 203 to Recipient 403 (Maria Garcia, B-)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- [Connection A] Step 1: Begin transaction and lock the organ row
START TRANSACTION;

SELECT O_ID, Type, Status
FROM Organ
WHERE O_ID = 203 AND Status = 'Available'
FOR UPDATE;
-- This acquires an exclusive row-level lock on Organ 203.
-- Result: O_ID=203, Type=Heart, Status=Available ✓

-- At this exact moment, Connection B tries to do the same thing...

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONNECTION B (City General Hospital — Hospital 303)                    ║
-- ║  Trying to allocate the SAME Organ 203 to Recipient 408 (Wei Zhang)    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- [Connection B] Step 1: Begin transaction and try to lock the same row
-- START TRANSACTION;
--
-- SELECT O_ID, Type, Status
-- FROM Organ
-- WHERE O_ID = 203 AND Status = 'Available'
-- FOR UPDATE;
--
-- ⚠️  CONNECTION B IS NOW BLOCKED!
-- InnoDB detects that Connection A already holds an exclusive lock on this
-- row. Connection B enters a LOCK WAIT state (default timeout: 50 seconds).
-- It will remain blocked until Connection A either COMMITs or ROLLBACKs.

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Back to CONNECTION A — Proceeds with allocation                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- [Connection A] Step 2: Organ is available and locked — create the match
INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID)
VALUES (703, CURRENT_DATE, 88, 203, 403, 302);
-- The AFTER INSERT trigger sets Organ 203 Status → 'Allocated'

-- [Connection A] Step 3: Link donor
INSERT INTO Provides_For (Donor_ID, Match_ID) VALUES (103, 703);

-- [Connection A] Step 4: Commit — releases the lock
COMMIT;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CONNECTION B — Lock is released, query resumes                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- [Connection B] The SELECT ... FOR UPDATE now executes.
-- But Status is now 'Allocated' (changed by Connection A's trigger).
-- The WHERE clause (Status = 'Available') no longer matches → EMPTY RESULT.
--
-- Connection B's application code sees 0 rows returned, knows the organ
-- is already taken, and gracefully rolls back:
-- ROLLBACK;

-- ═══════════════════════════════════════════════════════════════════════════
-- RESULT SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ Connection A: Successfully allocated Organ 203 to Recipient 403
--                  at Apollo Health Center (Hospital 302).
-- ❌ Connection B: Found 0 available rows → Rolled back gracefully.
--                  No double allocation occurred.
--
-- KEY MECHANISM: InnoDB Row-Level Locking
-- ─────────────────────────────────────────
-- 1. SELECT ... FOR UPDATE acquires an EXCLUSIVE (X) lock on the selected rows.
-- 2. Any other transaction trying to read or write the same row with
--    FOR UPDATE or FOR SHARE will BLOCK until the lock is released.
-- 3. The lock is released when the holding transaction COMMITs or ROLLBACKs.
-- 4. This ensures SERIALIZABLE access to the critical organ row, preventing
--    race conditions and double allocations.
-- 5. If Connection B waited longer than innodb_lock_wait_timeout (default 50s),
--    it would receive ERROR 1205: "Lock wait timeout exceeded" and auto-rollback.
-- ═══════════════════════════════════════════════════════════════════════════

-- Verification: Organ 203 should be Allocated, matched to Recipient 403
SELECT o.O_ID, o.Type, o.Status, mr.Recipient_ID, mr.Hospital_ID
FROM Organ o
JOIN Match_Record mr ON o.O_ID = mr.Organ_ID
WHERE o.O_ID = 203;
