-- Train table
CREATE TABLE IF NOT EXISTS `trains` (
    `train_number` INT PRIMARY KEY,
    `train_name` VARCHAR(100) NOT NULL,
    `category` ENUM('Express', 'Passenger', 'SuperFast') NOT NULL,
    `total_coaches` INT DEFAULT 0,
    `fare_multiplier` DECIMAL(3,2) DEFAULT 1.00,
    CHECK (fare_multiplier > 0)
);

-- Coach table
CREATE TABLE IF NOT EXISTS `coaches` (
    `coach_id` VARCHAR(10) PRIMARY KEY,
    `train_number` INT DEFAULT NULL,
    `coach_category` ENUM('AC1', 'AC2', 'AC3', 'Sleeper', 'General', 'RAC') NOT NULL,
    `total_seats` INT NOT NULL,
    `base_fare_per_km` DECIMAL(10,2) NOT NULL,
    `commission_date` DATE NOT NULL,
    `retirement_date` DATE,
    FOREIGN KEY (`train_number`) REFERENCES `trains`(`train_number`),
    CHECK (`retirement_date` IS NULL OR `retirement_date` >= `commission_date`),
    CHECK (`total_seats` > 0),
    CHECK (`base_fare_per_km` > 0)
);