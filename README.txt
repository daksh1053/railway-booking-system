# Railway Database System - Project Documentation

## Project Overview
The Railway Database System is a comprehensive database solution designed for managing train operations, ticket bookings, and passenger information. The system handles various aspects of railway management including:

- Train schedules and route management
- Coach and seat inventory management
- Station information
- Ticket booking and cancellation
- Passenger information tracking
- Payment processing
- Seat availability management

## How to Run

intialise my sql server
1. mysql --local-infile=1 -u root -p
2. SET GLOBAL local_infile = 1;
3. source ./initialise/create_db.sql

start python flask reverse proxy to run the sql queries.
1. set up a python virtual environment
2. pip install mysql-connector-python flask flask-cors
3. run the sql_queries.py file

frontend
1. cd to the frontend folder
2. npm install
3. npm run dev


## Implementation Approach

### Database Design
We implemented a relational database design using MySQL with the following key characteristics:

1. **Normalized Structure**: Our database follows 3NF (Third Normal Form) to minimize redundancy and improve data integrity. We separated related but independent data into appropriate tables.

2. **Entity Relationships**: We carefully modeled the relationships between entities such as trains, routes, coaches, stations, passengers, and tickets with appropriate foreign key constraints.

3. **Data Integrity**: We implemented CHECK constraints, NOT NULL constraints, and unique constraints to maintain data integrity across the system.

4. **Scalable Design**: The database structure allows for easy scaling to accommodate more trains, routes, and passengers as needed.

### Key Components Implemented

#### 1. Core Data Structure
- **Trains and Coaches**: We created a flexible system for managing train information with different categories (SuperFast, Express, Passenger) and coach types (AC1, AC2, AC3, Sleeper, General).
  
- **Stations and Routes**: The system stores detailed information about stations and defines routes between origin and destination stations.

- **Train Routes and Schedules**: We implemented a system to manage train operations on specific routes with detailed scheduling information.

#### 2. Booking System
- **Passenger Management**: The system stores passenger information with support for different concession categories.

- **Ticket Generation**: We implemented a PNR (Passenger Name Record) based ticketing system that handles booking details, seat allocation, and fare calculation.

- **Payment Processing**: The database supports multiple payment methods and tracks payment status.

#### 3. Advanced Features
- **Seat Availability Management**: We developed a sophisticated seat pool system that maintains real-time seat availability information for each train, route, and date.

- **Cancellation Handling**: The system includes a complete cancellation workflow with automatic refund calculation and seat status updates.

- **Day-Based Scheduling**: Trains can be scheduled to run on specific days of the week with appropriate arrival and departure times.

### Database Automation
We implemented several automation features through stored procedures and triggers:

1. **Seat Pool Generation**: Automated procedures create available seat records for the next three months of train operations.

2. **Cancellation Processing**: A trigger automatically handles all aspects of ticket cancellation, including seat release, refund processing, and status updates.

3. **Fare Calculation**: The system automatically calculates fares based on train category, coach type, distance, and applicable concessions.

## Database Schema Overview

The database consists of 13 interconnected tables:

1. **trains**: Stores train information (number, name, category, coaches, fare multiplier)
2. **coaches**: Stores coach information (ID, train, category, seats, fare, dates)
3. **stations**: Stores station details (ID, abbreviation, city, state)
4. **routes**: Represents paths between origin and destination stations
5. **train_routes**: Links trains to routes with operational details
6. **train_route_stations**: Stores station stops on train routes
7. **passengers**: Stores passenger information
8. **tickets**: Represents bookings made by passengers
9. **ticket_passengers**: Links tickets to passengers with seat allocation
10. **available_seat_pool**: Manages seat availability
11. **payment**: Stores payment information
12. **cancellations**: Stores cancelled ticket information
13. **user**: Stores system user accounts

## Sample Data Population
We populated the database with sample data that demonstrates the full functionality of the system:

- Multiple train categories and routes across Indian cities
- Various coach types with different fare structures
- Complete route information with intermediate station stops
- Sample passenger and ticket data
- Payment and cancellation records

## Complex Query Support
The database supports a wide range of analytical and operational queries, including:

- Seat availability checking for specific trains, dates, and coach types
- Route information with all station stops, distances, and timing
- Revenue analysis by train category, route, or time period
- Passenger booking history and preferences
- Cancellation patterns and refund processing

## Performance Optimization
We implemented several performance optimizations:

1. **Indexing**: Strategic indices are in place for frequently queried columns to improve search performance
2. **Query Optimization**: Complex queries were analyzed and optimized for better execution plans
3. **Batch Processing**: Seat pool generation uses batch inserts for efficiency

## Testing and Validation
The database has been extensively tested with:

- Sample data insertion and verification
- Transaction processing for bookings and cancellations
- Edge case handling for various scenarios
- Performance testing for high-volume operations

This Railway Database System provides a solid foundation for railway management applications, offering a complete, normalized database structure with robust business logic implemented through triggers and stored procedures. 