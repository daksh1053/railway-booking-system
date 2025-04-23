-- Script to calculate distances and times for all train routes
USE railway;

-- First, set the distance and time for the first station in each route to 0
UPDATE train_route_stations trs
JOIN (
    SELECT train_route_id, MIN(station_order) as first_order
    FROM train_route_stations
    GROUP BY train_route_id
) first ON trs.train_route_id = first.train_route_id AND trs.station_order = first.first_order
SET trs.distance_from_origin = 0,
    trs.time_from_origin = '00:00:00';

-- For each subsequent station, calculate based on the previous station
-- This approach uses a join to connect each station with its previous station

-- Calculate distances between consecutive stations
CREATE TEMPORARY TABLE IF NOT EXISTS station_distances AS
SELECT 
    curr.train_route_id,
    curr.train_route_station_id,
    curr.station_order,
    ROUND(
        6371 * acos(
            cos(radians(s_prev.latitude)) * cos(radians(s_curr.latitude)) * 
            cos(radians(s_curr.longitude) - radians(s_prev.longitude)) + 
            sin(radians(s_prev.latitude)) * sin(radians(s_curr.latitude))
        )
    , 2) AS distance_to_prev,
    TIMEDIFF(IFNULL(curr.arrival_time, curr.departure_time), prev.departure_time) AS time_to_prev
FROM train_route_stations curr
JOIN train_route_stations prev ON curr.train_route_id = prev.train_route_id AND curr.station_order = prev.station_order + 1
JOIN stations s_curr ON curr.station_id = s_curr.station_id
JOIN stations s_prev ON prev.station_id = s_prev.station_id;

-- Update station 2 in each route (directly after the origin)
UPDATE train_route_stations trs
JOIN station_distances sd ON trs.train_route_station_id = sd.train_route_station_id
SET trs.distance_from_origin = sd.distance_to_prev,
    trs.time_from_origin = sd.time_to_prev
WHERE trs.station_order = 2;

-- Update station 3 in each route
UPDATE train_route_stations trs3
JOIN train_route_stations trs2 ON trs3.train_route_id = trs2.train_route_id AND trs3.station_order = 3 AND trs2.station_order = 2
JOIN station_distances sd ON trs3.train_route_station_id = sd.train_route_station_id
SET trs3.distance_from_origin = trs2.distance_from_origin + sd.distance_to_prev,
    trs3.time_from_origin = ADDTIME(trs2.time_from_origin, sd.time_to_prev)
WHERE trs3.station_order = 3;

-- Update station 4 in each route
UPDATE train_route_stations trs4
JOIN train_route_stations trs3 ON trs4.train_route_id = trs3.train_route_id AND trs4.station_order = 4 AND trs3.station_order = 3
JOIN station_distances sd ON trs4.train_route_station_id = sd.train_route_station_id
SET trs4.distance_from_origin = trs3.distance_from_origin + sd.distance_to_prev,
    trs4.time_from_origin = ADDTIME(trs3.time_from_origin, sd.time_to_prev)
WHERE trs4.station_order = 4;

-- Update station 5 in each route
UPDATE train_route_stations trs5
JOIN train_route_stations trs4 ON trs5.train_route_id = trs4.train_route_id AND trs5.station_order = 5 AND trs4.station_order = 4
JOIN station_distances sd ON trs5.train_route_station_id = sd.train_route_station_id
SET trs5.distance_from_origin = trs4.distance_from_origin + sd.distance_to_prev,
    trs5.time_from_origin = ADDTIME(trs4.time_from_origin, sd.time_to_prev)
WHERE trs5.station_order = 5;

-- Update station 6 in each route (if any)
UPDATE train_route_stations trs6
JOIN train_route_stations trs5 ON trs6.train_route_id = trs5.train_route_id AND trs6.station_order = 6 AND trs5.station_order = 5
JOIN station_distances sd ON trs6.train_route_station_id = sd.train_route_station_id
SET trs6.distance_from_origin = trs5.distance_from_origin + sd.distance_to_prev,
    trs6.time_from_origin = ADDTIME(trs5.time_from_origin, sd.time_to_prev)
WHERE trs6.station_order = 6;

-- Update station 7 in each route (if any)
UPDATE train_route_stations trs7
JOIN train_route_stations trs6 ON trs7.train_route_id = trs6.train_route_id AND trs7.station_order = 7 AND trs6.station_order = 6
JOIN station_distances sd ON trs7.train_route_station_id = sd.train_route_station_id
SET trs7.distance_from_origin = trs6.distance_from_origin + sd.distance_to_prev,
    trs7.time_from_origin = ADDTIME(trs6.time_from_origin, sd.time_to_prev)
WHERE trs7.station_order = 7;

-- Update station 8 in each route (if any)
UPDATE train_route_stations trs8
JOIN train_route_stations trs7 ON trs8.train_route_id = trs7.train_route_id AND trs8.station_order = 8 AND trs7.station_order = 7
JOIN station_distances sd ON trs8.train_route_station_id = sd.train_route_station_id
SET trs8.distance_from_origin = trs7.distance_from_origin + sd.distance_to_prev,
    trs8.time_from_origin = ADDTIME(trs7.time_from_origin, sd.time_to_prev)
WHERE trs8.station_order = 8;

-- Update station 9 in each route (if any)
UPDATE train_route_stations trs9
JOIN train_route_stations trs8 ON trs9.train_route_id = trs8.train_route_id AND trs9.station_order = 9 AND trs8.station_order = 8
JOIN station_distances sd ON trs9.train_route_station_id = sd.train_route_station_id
SET trs9.distance_from_origin = trs8.distance_from_origin + sd.distance_to_prev,
    trs9.time_from_origin = ADDTIME(trs8.time_from_origin, sd.time_to_prev)
WHERE trs9.station_order = 9;

-- Update station 10 in each route (if any)
UPDATE train_route_stations trs10
JOIN train_route_stations trs9 ON trs10.train_route_id = trs9.train_route_id AND trs10.station_order = 10 AND trs9.station_order = 9
JOIN station_distances sd ON trs10.train_route_station_id = sd.train_route_station_id
SET trs10.distance_from_origin = trs9.distance_from_origin + sd.distance_to_prev,
    trs10.time_from_origin = ADDTIME(trs9.time_from_origin, sd.time_to_prev)
WHERE trs10.station_order = 10;

-- Clean up
DROP TEMPORARY TABLE IF EXISTS station_distances;

-- Verify the results
SELECT 'Distance and time calculation complete' AS message;
SELECT train_route_id, station_order, distance_from_origin, time_from_origin 
FROM train_route_stations 
ORDER BY train_route_id, station_order 
LIMIT 10; 