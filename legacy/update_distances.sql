USE railway;

-- First, make sure the pending_route_updates table exists
CREATE TABLE IF NOT EXISTS pending_route_updates (
    train_route_id INT PRIMARY KEY
);

-- Insert all train_route_ids into the pending updates table
INSERT IGNORE INTO pending_route_updates
SELECT DISTINCT train_route_id FROM train_route_stations;

-- Process the pending updates
CALL process_pending_updates();

-- Verify the results
SELECT * FROM train_route_stations ORDER BY train_route_id, station_order; 