-- Procedures and triggers to calculate and update distance_from_origin and time_from_origin

-- Set delimiter for procedure definitions
DELIMITER //

-- Procedure to calculate and update distance and time from origin for all stations in a train route
CREATE PROCEDURE calculate_station_distances()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_train_route_id INT;
    DECLARE cur CURSOR FOR SELECT DISTINCT train_route_id FROM train_route_stations;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO current_train_route_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Update the first station (origin)
        UPDATE train_route_stations 
        SET distance_from_origin = 0, 
            time_from_origin = '00:00:00' 
        WHERE train_route_id = current_train_route_id 
        AND station_order = 1;
        
        -- Update subsequent stations one by one to avoid the recursive update issue
        CALL update_single_route_distances(current_train_route_id);
    END LOOP;
    
    CLOSE cur;
END //

-- Helper procedure to update distances for a single route
CREATE PROCEDURE update_single_route_distances(IN route_id INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE curr_order INT;
    DECLARE max_order INT;
    DECLARE prev_distance FLOAT;
    DECLARE prev_time TIME;
    DECLARE curr_station_id VARCHAR(20);
    DECLARE prev_station_id VARCHAR(20);
    DECLARE curr_arrival TIME;
    DECLARE prev_departure TIME;
    DECLARE distance_between FLOAT;
    DECLARE time_between TIME;
    
    -- Find the maximum station order for this route
    SELECT MAX(station_order) INTO max_order 
    FROM train_route_stations 
    WHERE train_route_id = route_id;
    
    -- Start from order 2 (since order 1 is already set to 0)
    SET curr_order = 2;
    
    -- Process each station in order
    WHILE curr_order <= max_order DO
        -- Get previous station's info
        SELECT station_id, departure_time, distance_from_origin, time_from_origin 
        INTO prev_station_id, prev_departure, prev_distance, prev_time
        FROM train_route_stations
        WHERE train_route_id = route_id AND station_order = curr_order - 1;
        
        -- Get current station's info
        SELECT station_id, arrival_time 
        INTO curr_station_id, curr_arrival
        FROM train_route_stations
        WHERE train_route_id = route_id AND station_order = curr_order;
        
        -- Calculate distance between stations using Haversine formula
        SELECT 
            ROUND(
                6371 * acos(
                    cos(radians(s1.latitude)) * cos(radians(s2.latitude)) * 
                    cos(radians(s2.longitude) - radians(s1.longitude)) + 
                    sin(radians(s1.latitude)) * sin(radians(s2.latitude))
                )
            , 2) INTO distance_between
        FROM stations s1, stations s2
        WHERE s1.station_id = prev_station_id AND s2.station_id = curr_station_id;
        
        -- Calculate time between stations
        SET time_between = TIMEDIFF(curr_arrival, prev_departure);
        
        -- Update the current station
        UPDATE train_route_stations
        SET distance_from_origin = prev_distance + IFNULL(distance_between, 0),
            time_from_origin = ADDTIME(prev_time, IFNULL(time_between, '00:00:00'))
        WHERE train_route_id = route_id AND station_order = curr_order;
        
        -- Move to next station
        SET curr_order = curr_order + 1;
    END WHILE;
END //

-- Create a table to track routes that need updating
CREATE TABLE IF NOT EXISTS pending_route_updates (
    train_route_id INT PRIMARY KEY,
    processed BOOLEAN DEFAULT FALSE
) //

-- Procedure to process pending updates
CREATE PROCEDURE process_pending_updates()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE route_id INT;
    DECLARE cur CURSOR FOR SELECT train_route_id FROM pending_route_updates WHERE processed = FALSE;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO route_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        CALL update_single_route_distances(route_id);
        
        -- Mark as processed
        UPDATE pending_route_updates SET processed = TRUE WHERE train_route_id = route_id;
    END LOOP;
    
    CLOSE cur;
    
    -- Clear the processed updates
    DELETE FROM pending_route_updates WHERE processed = TRUE;
END //

-- Instead of direct triggers, use triggers to mark routes for update
CREATE TRIGGER after_train_route_stations_insert
AFTER INSERT ON train_route_stations
FOR EACH ROW
BEGIN
    -- Add to pending updates
    INSERT IGNORE INTO pending_route_updates (train_route_id, processed) 
    VALUES (NEW.train_route_id, FALSE);
    
    -- Process immediately if this completes a route (has first station)
    IF (SELECT COUNT(*) FROM train_route_stations 
        WHERE train_route_id = NEW.train_route_id AND station_order = 1) > 0 THEN
        CALL update_single_route_distances(NEW.train_route_id);
        UPDATE pending_route_updates SET processed = TRUE WHERE train_route_id = NEW.train_route_id;
    END IF;
END //

CREATE TRIGGER after_train_route_stations_update
AFTER UPDATE ON train_route_stations
FOR EACH ROW
BEGIN
    IF OLD.arrival_time <> NEW.arrival_time OR 
       OLD.departure_time <> NEW.departure_time OR
       OLD.station_order <> NEW.station_order THEN
        
        -- Add to pending updates
        INSERT IGNORE INTO pending_route_updates (train_route_id, processed) 
        VALUES (NEW.train_route_id, FALSE);
        
        -- Process immediately if this is not part of a batch operation
        IF (SELECT COUNT(*) FROM pending_route_updates WHERE processed = FALSE) < 5 THEN
            CALL process_pending_updates();
        END IF;
    END IF;
END //

-- Add a trigger for after a batch of inserts (e.g., after loading data)
-- This will run after each statement that affects train_route_stations
CREATE TRIGGER after_train_route_stations_statement
AFTER INSERT ON train_route_stations
FOR EACH STATEMENT
BEGIN
    -- Process any pending updates
    CALL process_pending_updates();
END //

DELIMITER ;

-- Initial calculation for all existing routes
CALL calculate_station_distances();

-- Create an event to process pending updates every minute
-- This is commented out as it requires EVENT privileges
-- Uncomment if you have the necessary privileges
/*
CREATE EVENT IF NOT EXISTS process_route_updates
ON SCHEDULE EVERY 1 MINUTE
DO
    CALL process_pending_route_updates();
*/