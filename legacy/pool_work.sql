DELIMITER //

CREATE PROCEDURE day_pool(IN c_date DATE)
BEGIN
    DECLARE v_day_of_week INT;
    DECLARE v_train_route_id INT;
    DECLARE v_coach_id VARCHAR(10);
    DECLARE v_train_number INT;
    DECLARE v_seat_number VARCHAR(10);
    DECLARE v_total_seats INT;
    DECLARE v_counter INT DEFAULT 1;
    DECLARE done BOOLEAN DEFAULT FALSE;
    
    DECLARE route_cursor CURSOR FOR 
        SELECT tr.train_route_id, tr.train_number
        FROM train_routes tr
        WHERE (WEEKDAY(c_date)+1) = tr.start_day_of_week 
          AND tr.active = 1;
          
    DECLARE coach_cursor CURSOR FOR
        SELECT c.coach_id, c.total_seats
        FROM coaches c
        WHERE c.train_number = v_train_number
          AND (c.retirement_date IS NULL OR c.retirement_date >= c_date);
          
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET v_day_of_week = WEEKDAY(c_date) + 1; -- 1=Monday, 2=Tuesday, ..., 7=Sunday
    
    -- Process each active train route for the given date
    OPEN route_cursor;
    
    route_loop: LOOP
        FETCH route_cursor INTO v_train_route_id, v_train_number;
        IF done THEN
            LEAVE route_loop;
        END IF;
        
        -- For each train route, add seats from all coaches
        SET done = FALSE; -- Reset for the inner loop
        OPEN coach_cursor;
        
        coach_loop: LOOP
            FETCH coach_cursor INTO v_coach_id, v_total_seats;
            IF done THEN
                LEAVE coach_loop;
            END IF;
            
            -- Add each seat in the coach to the available seat pool
            SET v_counter = 1;
            WHILE v_counter <= v_total_seats DO
                SET v_seat_number = CONCAT(v_counter);
                
                -- Check if this seat already exists in the pool for this date and train route
                IF NOT EXISTS (
                    SELECT 1 FROM available_seat_pool 
                    WHERE train_route_id = v_train_route_id
                    AND date = c_date
                    AND coach_id = v_coach_id
                    AND seat_number = v_seat_number
                ) THEN
                    -- Insert new available seat
                    INSERT INTO available_seat_pool 
                    (train_route_id, date, coach_id, seat_number, status)
                    VALUES 
                    (v_train_route_id, c_date, v_coach_id, v_seat_number, 'available');
                END IF;
                
                SET v_counter = v_counter + 1;
            END WHILE;
        END LOOP coach_loop;
        
        CLOSE coach_cursor;
        SET done = FALSE; -- Reset for the next iteration of the outer loop
    END LOOP route_loop;
    
    CLOSE route_cursor;
END //
DELIMITER ;