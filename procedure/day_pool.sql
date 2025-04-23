DELIMITER //

-- First, add a composite index to improve the performance of the EXISTS check and duplicate detection
-- Execute this statement separately in your database
-- CREATE UNIQUE INDEX idx_seat_pool_lookup ON available_seat_pool(train_route_id, date, coach_id, seat_number);

CREATE PROCEDURE day_pool(IN c_date DATE)
BEGIN
    DECLARE v_day_of_week INT;
    DECLARE v_train_route_id INT;
    DECLARE v_coach_id VARCHAR(10);
    DECLARE v_train_number INT;
    DECLARE v_total_seats INT;
    DECLARE done BOOLEAN DEFAULT FALSE;
    DECLARE batch_size INT DEFAULT 1000; -- Process seats in batches
    
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
    
    -- Create a temporary table to store all seats to insert
    DROP TEMPORARY TABLE IF EXISTS temp_seat_pool;
    CREATE TEMPORARY TABLE temp_seat_pool (
        train_route_id INT,
        date DATE,
        coach_id VARCHAR(10),
        seat_number VARCHAR(10),
        status ENUM('available', 'partially_available', 'booked')
    );
    
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
            
            -- Process large coaches in batches to avoid excessive memory usage
            SET @start_seat = 1;
            WHILE @start_seat <= v_total_seats DO
                SET @end_seat = LEAST(@start_seat + batch_size - 1, v_total_seats);
                
                -- Generate a sequence of numbers from @start_seat to @end_seat
                SET @sql = CONCAT('
                    INSERT INTO temp_seat_pool (train_route_id, date, coach_id, seat_number, status)
                    WITH RECURSIVE seat_numbers AS (
                        SELECT ', @start_seat, ' AS seat_num
                        UNION ALL
                        SELECT seat_num + 1 FROM seat_numbers WHERE seat_num < ', @end_seat, '
                    )
                    SELECT 
                        ', v_train_route_id, ', 
                        ''', c_date, ''', 
                        ''', v_coach_id, ''', 
                        CAST(seat_num AS CHAR), 
                        ''available''
                    FROM seat_numbers
                ');
                
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                
                SET @start_seat = @end_seat + 1;
            END WHILE;
            
        END LOOP coach_loop;
        
        CLOSE coach_cursor;
        SET done = FALSE; -- Reset for the next iteration of the outer loop
    END LOOP route_loop;
    
    CLOSE route_cursor;
    
    -- Bulk insert all seats at once using INSERT IGNORE to bypass duplicates
    -- This approach relies on a unique index on (train_route_id, date, coach_id, seat_number)
    INSERT IGNORE INTO available_seat_pool 
    (train_route_id, date, coach_id, seat_number, status)
    SELECT 
        train_route_id, 
        date, 
        coach_id, 
        seat_number, 
        status
    FROM 
        temp_seat_pool;
    
    -- Clean up
    DROP TEMPORARY TABLE IF EXISTS temp_seat_pool;
END //
DELIMITER ;