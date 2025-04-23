-- Table 1: Links trains and routes with days of operation
create table if not exists `train_routes` (
    `train_route_id` int auto_increment primary key,
    `route_id` varchar(20) not null,
    `train_number` int not null,
    `start_day_of_week` tinyint not null comment '1=Monday, 2=Tuesday, ..., 7=Sunday',
    `end_day_of_week` tinyint not null comment '1=Monday, 2=Tuesday, ..., 7=Sunday',
    `start_time` time not null,
    `end_time` time not null,
    `active` boolean default true,
    foreign key (`route_id`) references `routes`(`route_id`),
    unique key `unique_train_route_day` (`route_id`, `train_number`, `start_day_of_week`)
);

-- Table 2: Stores all stations for each train route
create table if not exists `train_route_stations` (
    `train_route_station_id` int auto_increment primary key,
    `train_route_id` int not null,
    `station_id` varchar(20) not null,
    `station_order` int not null,
    `arrival_time` time,
    `journey_day` int default 0,
    `departure_time` time,
    `distance_from_origin` float not null,
    `time_from_origin` int not null,
    foreign key (`train_route_id`) references `train_routes`(`train_route_id`),
    foreign key (`station_id`) references `stations`(`station_id`),
    unique key `unique_train_route_station` (`train_route_id`, `station_id`)
);
