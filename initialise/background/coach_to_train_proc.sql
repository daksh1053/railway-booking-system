-- Procedure to update train coach count when a coach is assigned or removed
DELIMITER //
CREATE PROCEDURE update_train_coach_count(IN p_train_number INT)
BEGIN
    -- Update the total_coaches count in the trains table
    -- by counting the number of coaches assigned to the train
    UPDATE trains
    SET total_coaches = (
        SELECT COUNT(*) 
        FROM coaches 
        WHERE train_number = p_train_number
    )
    WHERE train_number = p_train_number;
END //
DELIMITER ;

-- Trigger to automatically update train coach count when a coach is assigned to a train
DELIMITER //
CREATE TRIGGER after_coach_assign
AFTER UPDATE ON coaches
FOR EACH ROW
BEGIN
    -- If train number was changed (either assigned or removed)
    IF OLD.train_number <> NEW.train_number OR 
       (OLD.train_number IS NULL AND NEW.train_number IS NOT NULL) OR
       (OLD.train_number IS NOT NULL AND NEW.train_number IS NULL) THEN
        
        -- Update the old train's coach count if there was one
        IF OLD.train_number IS NOT NULL THEN
            CALL update_train_coach_count(OLD.train_number);
        END IF;
        
        -- Update the new train's coach count if there is one
        IF NEW.train_number IS NOT NULL THEN
            CALL update_train_coach_count(NEW.train_number);
        END IF;
    END IF;
END //
DELIMITER ;

-- Trigger to automatically update train coach count when a coach is inserted
DELIMITER //
CREATE TRIGGER after_coach_insert
AFTER INSERT ON coaches
FOR EACH ROW
BEGIN
    -- If the coach is assigned to a train
    IF NEW.train_number IS NOT NULL THEN
        CALL update_train_coach_count(NEW.train_number);
    END IF;
END //
DELIMITER ;

-- Trigger to automatically update train coach count when a coach is deleted
DELIMITER //
CREATE TRIGGER after_coach_delete
AFTER DELETE ON coaches
FOR EACH ROW
BEGIN
    -- If the coach was assigned to a train
    IF OLD.train_number IS NOT NULL THEN
        CALL update_train_coach_count(OLD.train_number);
    END IF;
END //
DELIMITER ;

