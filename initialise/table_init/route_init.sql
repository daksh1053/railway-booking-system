-- Station table
CREATE TABLE IF NOT EXISTS `stations` (
    `station_id` VARCHAR(10) PRIMARY KEY,
    `station_abbreviation` VARCHAR(10) NOT NULL,
    `station_city` VARCHAR(100) NOT NULL,
    `station_state` VARCHAR(100) NOT NULL
);
-- Route table
CREATE TABLE IF NOT EXISTS `routes` (
    `route_id` VARCHAR(20) PRIMARY KEY,
    `origin_station` VARCHAR(10) NOT NULL,
    `destination_station` VARCHAR(10) NOT NULL,
    FOREIGN KEY (`origin_station`) REFERENCES `stations`(`station_id`),
    FOREIGN KEY (`destination_station`) REFERENCES `stations`(`station_id`),
    CHECK (`origin_station` <> `destination_station`),
    UNIQUE (`origin_station`, `destination_station`)
);

