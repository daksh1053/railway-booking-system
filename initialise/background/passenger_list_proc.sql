DELIMITER $$
CREATE PROCEDURE get_train_passengers(IN p_train_number INT, IN p_travel_date DATE)
BEGIN
    SELECT 
        t.pnr,
        p.passenger_id,
        p.name,
        p.phone_number,
        p.concession_category,
        tp.coach_number,
        tp.seat_number,
        s1.station_city AS boarding_from,
        s2.station_city AS traveling_to,
        t.status
    FROM 
        tickets t
        JOIN ticket_passengers tp ON t.pnr = tp.pnr
        JOIN passengers p ON tp.passenger_id = p.passenger_id
        JOIN stations s1 ON t.origin_station = s1.station_id
        JOIN stations s2 ON t.destination_station = s2.station_id
    WHERE 
        t.train_number = p_train_number
        AND t.travel_date = p_travel_date
        AND t.status IN ('Confirmed', 'Waitlisted')
    ORDER BY 
        CASE t.status 
            WHEN 'Confirmed' THEN 1 
            WHEN 'Waitlisted' THEN 2 
        END,
        tp.coach_number,
        tp.seat_number;
END $$
DELIMITER ;