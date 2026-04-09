-- ============================================================================
-- TASK 5 (Part 1): TRIGGERS
-- Organ Donation & Transplant Matching System
-- ============================================================================
USE OrganTransplantDB;

-- --------------------------------------------------------------------------
-- Trigger 1: Prevent matching an expired organ
-- This safety trigger fires BEFORE a match is created to ensure the linked
-- organ has not passed its Expiry_Time. If it has, it raises an exception
-- to block the insert.
-- --------------------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER Prevent_Expired_Organ_Match
BEFORE INSERT ON Match_Record
FOR EACH ROW
BEGIN
    DECLARE organ_expiry TIMESTAMP;

    -- Retrieve the expiry time of the organ being matched
    SELECT Expiry_Time INTO organ_expiry
    FROM Organ
    WHERE O_ID = NEW.Organ_ID;

    -- If the organ is expired based on current timestamp, prevent insertion
    IF organ_expiry < CURRENT_TIMESTAMP THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Organ has expired and cannot be matched or allocated for surgery.';
    END IF;
END $$
DELIMITER ;


-- --------------------------------------------------------------------------
-- Trigger 2: Automatically update Organ status after a Match is created
-- This automation trigger fires AFTER a match is successfully inserted,
-- automatically updating the status of the assigned organ so it won't
-- be matched again.
-- --------------------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER Update_Organ_Status_After_Match
AFTER INSERT ON Match_Record
FOR EACH ROW
BEGIN
    UPDATE Organ
    SET Status = 'Allocated'
    WHERE O_ID = NEW.Organ_ID;
END $$
DELIMITER ;
