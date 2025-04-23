-- Load data from train_routes.csv
LOAD DATA LOCAL INFILE './initialise/data/train_routes.csv'
INTO TABLE train_routes
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(train_route_id, route_id, train_number, start_day_of_week, end_day_of_week, 
 @start_time, @end_time, active)
SET start_time = TIME_FORMAT(@start_time, '%H:%i:%s'),
    end_time = TIME_FORMAT(@end_time, '%H:%i:%s');

-- Load data from train_route_stations.csv
-- Using the distance_from_origin and time_from_origin values from the CSV
LOAD DATA LOCAL INFILE './initialise/data/train_route_stations.csv'
INTO TABLE train_route_stations
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(train_route_station_id, train_route_id, station_id, station_order, 
 @arrival_time, @departure_time, distance_from_origin, time_from_origin)
SET arrival_time = CASE 
                    WHEN @arrival_time = '0' THEN NULL
                    ELSE TIME_FORMAT(@arrival_time, '%H:%i:%s')
                  END,
    departure_time = CASE 
                      WHEN @departure_time = '0' THEN NULL
                      ELSE TIME_FORMAT(@departure_time, '%H:%i:%s')
                    END;
