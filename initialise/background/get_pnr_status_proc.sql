DELIMITER $$
CREATE PROCEDURE get_pnr_status(IN p_pnr VARCHAR(10))
BEGIN
    SELECT 
        t.pnr,
        t.status,
        t.train_number,
        tr.train_name,
        s1.station_id AS origin_id,
        s1.station_city AS origin_city,
        s2.station_id AS destination_id,
        s2.station_city AS destination_city,
        t.travel_date,
        t.booking_date,
        t.total_fare,
        t.waiting_list_number,
        p.payment_status,
        p.payment_type
    FROM 
        tickets t
        JOIN trains tr ON t.train_number = tr.train_number
        JOIN stations s1 ON t.origin_station = s1.station_id
        JOIN stations s2 ON t.destination_station = s2.station_id
        JOIN payment p ON t.payment_id = p.payment_id
    WHERE 
        t.pnr = p_pnr;
    
    -- Get passenger details for the ticket
    SELECT 
        p.name,
        p.passenger_id,
        tp.coach_number,
        tp.seat_number,
        tp.fare,
        p.concession_category
    FROM 
        ticket_passengers tp
        JOIN passengers p ON tp.passenger_id = p.passenger_id
    WHERE 
        tp.pnr = p_pnr;
END$$
DELIMITER ;