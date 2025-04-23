DELIMITER //

CREATE TRIGGER after_ticket_cancel 
AFTER UPDATE ON tickets
FOR EACH ROW
BEGIN
    -- Declare all variables at the beginning of the block (outside the IF)
    DECLARE refund_amount DECIMAL(10,2);
    
    -- Only proceed if status changed to Cancelled
    IF OLD.status != 'Cancelled' AND NEW.status = 'Cancelled' THEN
    
        -- Calculate refund amount (90% of total fare)
        SET refund_amount = NEW.total_fare * 0.9;
        
        -- 1. Update all seats in the available_seat_pool to available
        UPDATE available_seat_pool
        SET status = 'available', pnr = NULL
        WHERE pnr = NEW.pnr;
        
        -- 2. Add record to cancellations table
        INSERT INTO cancellations (
            pnr, 
            cancellation_date, 
            refund_amount, 
            refund_status,
            train_number,
            journey_date,
            ticket_payment_id
        ) VALUES (
            NEW.pnr,
            CURRENT_DATE(),
            refund_amount,
            'Completed',
            NEW.train_number,
            NEW.travel_date,
            NEW.payment_id
        );
        
        -- 3. Remove entries from ticket_passengers table
        DELETE FROM ticket_passengers
        WHERE pnr = NEW.pnr;

        update payment set payment_status='Refunded' where payment_id=NEW.payment_id;
        
    END IF;
END //

DELIMITER ;
