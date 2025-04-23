CREATE DATABASE IF NOT EXISTS `railway_database`;
USE `railway_database`;

SOURCE initialise/table_init/train_init.sql;

SOURCE initialise/background/coach_to_train_proc.sql;

SOURCE initialise/data_load/load_train_data.sql;

SOURCE initialise/table_init/route_init.sql;

SOURCE initialise/data_load/load_route_data.sql;

SOURCE initialise/table_init/route_train_init.sql;

SOURCE initialise/data_load/load_route_train_data.sql;

SOURCE initialise/table_init/ticket_pool_init.sql;

CREATE UNIQUE INDEX idx_seat_pool_lookup ON available_seat_pool(train_route_id, date, coach_id, seat_number);

SOURCE procedure/day_pool.sql;

SOURCE initialise/background/get_pnr_status_proc.sql;

SOURCE initialise/background/ticket_trigger.sql;

DELIMITER //

CREATE PROCEDURE run_day_pool_for_3_months()
BEGIN
    DECLARE start_date DATE;
    DECLARE end_date DATE;
    DECLARE cur_date DATE;
    
    -- Set the date range (90 days from the current date)
    SET start_date = CURDATE();
    SET end_date = DATE_ADD(start_date, INTERVAL 90 DAY);
    SET cur_date = start_date;
    
    -- Process each date in the range
    WHILE cur_date <= end_date DO
        -- Call the day_pool procedure for each date
        CALL day_pool(cur_date);
        
        -- Display progress message
        SELECT CONCAT('Processed date: ', cur_date) AS progress;
        
        -- Move to the next date
        SET cur_date = DATE_ADD(cur_date, INTERVAL 1 DAY);
    END WHILE;
    
    SELECT 'Completed processing all dates!' AS status;
END //

DELIMITER ;

-- Call the procedure
CALL run_day_pool_for_3_months();

-- Show warnings that occurred during data loading
SHOW WARNINGS;
