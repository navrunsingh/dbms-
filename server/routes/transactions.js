// routes/transactions.js — Transaction Conflict Demonstration (Task 6)
const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST simulate two hospitals trying to claim the same organ
router.post('/conflict', async (req, res) => {
  const { Organ_ID, Hospital_A_ID, Hospital_B_ID, Recipient_A_ID, Recipient_B_ID } = req.body;

  // We need two separate connections to simulate two concurrent sessions
  const connA = await pool.getConnection();
  const connB = await pool.getConnection();

  const log = [];

  try {
    // ── Step 1: Both hospitals begin transactions ──
    log.push({ step: 1, connection: 'A', action: 'BEGIN TRANSACTION', status: 'ok' });
    await connA.beginTransaction();

    log.push({ step: 2, connection: 'B', action: 'BEGIN TRANSACTION', status: 'ok' });
    await connB.beginTransaction();

    // ── Step 2: Hospital A locks the organ row with SELECT ... FOR UPDATE ──
    log.push({ step: 3, connection: 'A', action: `SELECT ... FOR UPDATE on Organ ${Organ_ID}`, status: 'executing' });
    const [organsA] = await connA.query(
      'SELECT O_ID, Type, Status, Blood_Group FROM Organ WHERE O_ID = ? AND Status = ? FOR UPDATE',
      [Organ_ID, 'Available']
    );

    if (organsA.length === 0) {
      await connA.rollback();
      await connB.rollback();
      log.push({ step: 3, connection: 'A', action: 'Organ not available', status: 'failed' });
      return res.json({ success: false, log, message: 'The organ is not currently available.' });
    }

    log.push({ step: 3, connection: 'A', action: `Lock acquired. Organ ${Organ_ID} is Available.`, status: 'ok', data: organsA[0] });

    // ── Step 3: Hospital B tries to lock the same row ──
    // This will BLOCK in a real concurrent scenario. We simulate the timeout.
    log.push({ step: 4, connection: 'B', action: `SELECT ... FOR UPDATE on Organ ${Organ_ID} — BLOCKED by Connection A's lock`, status: 'waiting' });

    // ── Step 4: Hospital A proceeds with allocation ──
    // Generate a unique M_ID
    const [[{ maxId }]] = await connA.query('SELECT COALESCE(MAX(M_ID), 700) + 1 AS maxId FROM Match_Record');

    await connA.query(
      'INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID) VALUES (?, CURRENT_DATE, 88, ?, ?, ?)',
      [maxId, Organ_ID, Recipient_A_ID, Hospital_A_ID]
    );
    log.push({ step: 5, connection: 'A', action: `INSERT Match_Record (M_ID=${maxId}). Trigger sets Organ → Allocated.`, status: 'ok' });

    // Link donor
    const donorId = organsA[0].Donor_ID || (await connA.query('SELECT Donor_ID FROM Organ WHERE O_ID = ?', [Organ_ID]))[0][0]?.Donor_ID;

    await connA.query(
      'INSERT INTO Provides_For (Donor_ID, Match_ID) VALUES ((SELECT Donor_ID FROM Organ WHERE O_ID = ?), ?)',
      [Organ_ID, maxId]
    );

    // ── Step 5: Hospital A commits — releases the lock ──
    await connA.commit();
    log.push({ step: 6, connection: 'A', action: 'COMMIT — Lock released. Organ is now Allocated.', status: 'success' });

    // ── Step 6: Hospital B's lock request unblocks ──
    // Now the row is released, Connection B's FOR UPDATE executes
    // But Status is no longer 'Available' → empty result
    const [organsB] = await connB.query(
      'SELECT O_ID, Type, Status FROM Organ WHERE O_ID = ? AND Status = ? FOR UPDATE',
      [Organ_ID, 'Available']
    );

    if (organsB.length === 0) {
      log.push({ step: 7, connection: 'B', action: `Lock acquired but Status is now 'Allocated'. WHERE clause returns 0 rows.`, status: 'failed' });
      await connB.rollback();
      log.push({ step: 8, connection: 'B', action: 'ROLLBACK — Organ already claimed by Hospital A.', status: 'rolled_back' });
    } else {
      // This shouldn't happen in our simulation, but handle gracefully
      await connB.rollback();
      log.push({ step: 7, connection: 'B', action: 'Unexpected: organ still available', status: 'error' });
    }

    res.json({
      success: true,
      winner: 'Hospital A',
      loser: 'Hospital B',
      message: `Hospital A (ID: ${Hospital_A_ID}) successfully claimed Organ ${Organ_ID}. Hospital B (ID: ${Hospital_B_ID}) was blocked by row lock and found the organ already allocated upon retry.`,
      log,
      explanation: {
        mechanism: 'InnoDB Row-Level Locking with SELECT ... FOR UPDATE',
        details: [
          'Connection A acquires an exclusive (X) lock on the organ row.',
          'Connection B attempts the same lock and enters LOCK WAIT state.',
          'Connection A completes the allocation and COMMITs, releasing the lock.',
          'Connection B\'s query now executes, but Status = \'Allocated\' — WHERE clause returns 0 rows.',
          'Connection B rolls back gracefully. No double allocation occurs.',
          'If Connection B waited longer than innodb_lock_wait_timeout (default 50s), it would get ERROR 1205.'
        ]
      }
    });

  } catch (err) {
    try { await connA.rollback(); } catch (_) {}
    try { await connB.rollback(); } catch (_) {}
    log.push({ step: 'error', connection: 'system', action: err.message, status: 'error' });
    res.status(500).json({ success: false, log, error: err.message });
  } finally {
    connA.release();
    connB.release();
  }
});

// POST test expired organ trigger (Scenario 2 demo)
router.post('/test-expired', async (req, res) => {
  const { Organ_ID } = req.body;
  const conn = await pool.getConnection();
  try {
    // Check 1: Does the organ exist?
    const [organs] = await conn.query('SELECT O_ID, Type, Expiry_Time, Status FROM Organ WHERE O_ID = ?', [Organ_ID]);
    if (organs.length === 0) {
      conn.release();
      return res.json({ blocked: true, reason: 'not_found', message: `Organ ${Organ_ID} does not exist in the database.` });
    }

    const organ = organs[0];

    // Check 2: Is the organ already allocated or used?
    if (organ.Status === 'Allocated' || organ.Status === 'Used') {
      conn.release();
      return res.json({ blocked: true, reason: 'already_used', message: `Organ ${Organ_ID} (${organ.Type}) has already been ${organ.Status.toLowerCase()}.` });
    }

    // Check 3: Is the organ already in a match record? (UNIQUE constraint)
    const [existingMatch] = await conn.query('SELECT M_ID FROM Match_Record WHERE Organ_ID = ?', [Organ_ID]);
    if (existingMatch.length > 0) {
      conn.release();
      return res.json({ blocked: true, reason: 'already_matched', message: `Organ ${Organ_ID} (${organ.Type}) has already been matched (Match ID: ${existingMatch[0].M_ID}).` });
    }

    // Now attempt the INSERT — the ONLY thing that can block it is the expiry trigger
    await conn.beginTransaction();

    const tempMID = 99000 + Math.floor(Math.random() * 999);
    await conn.query(
      'INSERT INTO Match_Record (M_ID, Match_Date, Compatibility_Score, Organ_ID, Recipient_ID, Hospital_ID) VALUES (?, CURRENT_DATE, 85, ?, 401, 301)',
      [tempMID, Organ_ID]
    );

    // If we get here, the trigger didn't block it (organ is NOT expired)
    // Roll back so we don't actually create a match from a demo
    await conn.rollback();
    res.json({
      blocked: false,
      message: `Organ ${Organ_ID} (${organ.Type}) is NOT expired. Expiry: ${organ.Expiry_Time}. The trigger did not fire.`
    });

  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    // The error is from our expiry trigger
    if (err.message.includes('expired')) {
      res.json({ blocked: true, reason: 'expired', message: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    conn.release();
  }
});

module.exports = router;
