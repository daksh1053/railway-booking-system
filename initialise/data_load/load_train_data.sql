-- Load data from trains.csv
LOAD DATA LOCAL INFILE './initialise/data/trains.csv'
INTO TABLE trains
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(train_number, train_name, category, @dummy, fare_multiplier)
SET total_coaches = 0;

-- Load data from coaches.csv
LOAD DATA LOCAL INFILE './initialise/data/coaches.csv'
INTO TABLE coaches
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(coach_id, train_number, coach_category, total_seats, base_fare_per_km, @commission_date, @retirement_date)
SET commission_date = STR_TO_DATE(CONCAT(@commission_date, ' 00:00:00'), '%Y-%m-%d %H:%i:%s'),
    retirement_date = CASE 
                        WHEN @retirement_date = 'NULL' THEN NULL
                        ELSE STR_TO_DATE(CONCAT(@retirement_date, ' 00:00:00'), '%Y-%m-%d %H:%i:%s')
                      END; 