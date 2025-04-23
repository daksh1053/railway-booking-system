-- Passenger table
CREATE TABLE IF NOT EXISTS `passengers` (
    `passenger_id` VARCHAR(20) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE,
    `phone_number` VARCHAR(15) NOT NULL,
    `concession_category` VARCHAR(50),
    `concession_multiplier` DECIMAL(3,2) DEFAULT 1.00,
    CHECK (`concession_multiplier` > 0 AND `concession_multiplier` <= 1.00)
);

CREATE TABLE IF NOT EXISTS `tickets` (
    `pnr` VARCHAR(10) PRIMARY KEY,
    `train_number` int NOT NULL,
    `start_station_position` int NOT NULL,
    `origin_station` VARCHAR(10) NOT NULL,
    `end_station_position` int NOT NULL,
    `destination_station` VARCHAR(10) NOT NULL,
    `travel_date` DATE NOT NULL,
    `booking_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `total_fare` DECIMAL(10,2) NOT NULL,
    `status` ENUM('Confirmed', 'Waitlisted', 'Cancelled', 'Payment Timeout') NOT NULL,
    `booked_by` VARCHAR(20) NOT NULL,
    `booked_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `payment_id` VARCHAR(10) NOT NULL,
    `waiting_list_number` INT,
    FOREIGN KEY (`train_number`) REFERENCES `trains`(`train_number`),
    FOREIGN KEY (`origin_station`) REFERENCES `stations`(`station_id`),
    FOREIGN KEY (`destination_station`) REFERENCES `stations`(`station_id`),
    FOREIGN KEY (`booked_by`) REFERENCES `passengers`(`passenger_id`),
    CHECK (`total_fare` >= 0)
);

-- Payment Categories table
CREATE TABLE IF NOT EXISTS `payment` (
    `payment_id` VARCHAR(10) PRIMARY KEY,
    `payment_status` ENUM('Pending', 'Completed', 'Refunded', 'Payment Timeout') NOT NULL,
    `payment_type` ENUM('Credit', 'Debit', 'UPI', 'NetBanking')
);

-- Ticket_Passenger table (PNR_LIST in the diagram)
CREATE TABLE IF NOT EXISTS `ticket_passengers` (
    `pnr` VARCHAR(10),
    `passenger_id` VARCHAR(20),
    `coach_number` VARCHAR(10),
    `seat_number` VARCHAR(10),
    `fare` DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (`pnr`, `passenger_id`),
    FOREIGN KEY (`pnr`) REFERENCES `tickets`(`pnr`),
    FOREIGN KEY (`passenger_id`) REFERENCES `passengers`(`passenger_id`),
    FOREIGN KEY (`coach_number`) REFERENCES `coaches`(`coach_id`),
    CHECK (`fare` >= 0)
);

-- Seat availability pool
CREATE TABLE IF NOT EXISTS `available_seat_pool` (
    `seat_pool_id` int auto_increment primary key,
    `train_route_id` int,
    `date` DATE,
    `coach_id` VARCHAR(10),
    `seat_number` VARCHAR(10),
    `status` ENUM('available', 'booked') NOT NULL,
    `pnr` VARCHAR(10),
    FOREIGN KEY (`train_route_id`) REFERENCES `train_routes`(`train_route_id`),
    FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`coach_id`),
    FOREIGN KEY (`pnr`) REFERENCES `tickets`(`pnr`)
);


create table if not exists `cancellations` (
    `cancellation_id` int auto_increment primary key,
    `pnr` VARCHAR(10),
    `cancellation_date` DATE,
    `refund_amount` DECIMAL(10,2),
    `refund_status` ENUM('Pending', 'Completed', 'Refunded') NOT NULL,
    `train_number` int,
    `ticket_payment_id` VARCHAR(10),
    `journey_date` DATE,
    FOREIGN KEY (`train_number`) REFERENCES `trains`(`train_number`),
    FOREIGN KEY (`ticket_payment_id`) REFERENCES `payment`(`payment_id`)
);


CREATE TABLE IF NOT EXISTS `user` (
    `user_id` int auto_increment primary key,
    `username` VARCHAR(100) NOT NULL,
    `password` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE
);
