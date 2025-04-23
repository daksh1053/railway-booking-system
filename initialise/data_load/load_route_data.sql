-- Load station data
LOAD DATA LOCAL INFILE './initialise/data/stations.csv'
INTO TABLE stations
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(station_id, station_abbreviation, station_city, station_state);

-- Load route data
LOAD DATA LOCAL INFILE './initialise/data/routes.csv'
INTO TABLE routes
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(route_id, origin_station, destination_station);
