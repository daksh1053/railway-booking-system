"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/BookingPage.css"

function BookingPage({ user }) {
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [formData, setFormData] = useState({
    fromStation: "",
    toStation: "",
    journeyDate: "",
    coachCategory: "Sleeper",
    selectedTrain: null, // New state for selected train
  })
  const [step, setStep] = useState(1) // New state to track the current step
  const [passengers, setPassengers] = useState([{ name: "", age: "", gender: "male", concessionType: "none" }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [paymentStep, setPaymentStep] = useState(false)
  const [paymentId, setPaymentId] = useState("")
  const [paymentType, setPaymentType] = useState("Credit")
  const [paymentTimer, setPaymentTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(15) // 2 minutes in seconds
  const [waitlistNumber, setWaitlistNumber] = useState(0) // New state to track waitlist number

  // Coach categories
  const coachCategories = ["AC1", "AC2", "AC3", "Sleeper", "General"]
  
  // Concession rates (percentage off)
  const concessionRates = {
    none: 0,
    senior: 10, // 40% off for senior citizens
    student: 20, // 50% off for students
    pwd: 30 // 75% off for persons with disabilities
  }

  // Fetch stations when component mounts
  useEffect(() => {
    console.log("BookingPage component mounted")
    fetchStations()
  }, [])

  const fetchStations = async () => {
    console.log("Fetching stations...")
    try {
      setLoading(true)
      // SQL Query to fetch all stations
      // SELECT station_id, station_city, station_abbreviation FROM stations ORDER BY station_city
      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "SELECT station_id, station_city, station_abbreviation FROM stations ORDER BY station_city",
        }),
      })

      const data = await response.json()
      console.log("Stations API response:", data)

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch stations")
      }

      setStations(data.results)
    } catch (err) {
      setError("Failed to load stations: " + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addPassenger = () => {
    console.log("Adding new passenger")
    setPassengers([...passengers, { name: "", age: "", gender: "male", concessionType: "none" }])
  }

  const removePassenger = (index) => {
    console.log("Removing passenger at index:", index)
    if (passengers.length > 1) {
      const newPassengers = [...passengers]
      newPassengers.splice(index, 1)
      setPassengers(newPassengers)
    }
  }

  const handlePassengerChange = (index, field, value) => {
    console.log(`Updating passenger ${index}, field: ${field}, value: ${value}`)
    const newPassengers = [...passengers]
    
    // If updating age and age is >= 60, automatically set senior citizen concession
    if (field === "age" && parseInt(value) >= 60 && newPassengers[index].concessionType === "none") {
      newPassengers[index].concessionType = "senior"
    } else if (field === "age" && parseInt(value) < 60 && newPassengers[index].concessionType === "senior") {
      // If they're no longer a senior citizen, remove the senior concession
      newPassengers[index].concessionType = "none"
    }
    
    newPassengers[index][field] = value
    setPassengers(newPassengers)
  }

  const handleFormChange = (e) => {
    console.log(`Form field changed: ${e.target.name} = ${e.target.value}`)
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // New function to get the maximum waitlist number
  const getMaxWaitlistNumber = async (trainNumber, journeyDate) => {
    console.log("Getting max waitlist number for train:", trainNumber, "on date:", journeyDate)
    try {
      const query = `
        SELECT MAX(waiting_list_number) as max_wl 
        FROM tickets 
        WHERE train_number = ${trainNumber} 
        AND travel_date = '${journeyDate}'
        AND status = 'Waitlisted'
      `

      console.log("Executing max waitlist query:", query)
      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
        }),
      })

      const data = await response.json()
      console.log("Max waitlist query response:", data)

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to get waitlist number")
      }

      // If there is no waitlisted ticket yet, start from 1
      if (!data.results || !data.results[0] || data.results[0].max_wl === null) {
        return 1
      }

      return data.results[0].max_wl + 1
    } catch (err) {
      console.error("Error getting max waitlist number:", err)
      return 1 // Default to 1 if there's an error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Form submitted with data:", { formData, passengers })
    setError("")

    // Validate form
    if (!formData.fromStation || !formData.toStation || !formData.journeyDate || !formData.coachCategory) {
      console.log("Validation failed: Missing journey details")
      setError("Please fill in all journey details")
      return
    }

    if (formData.fromStation === formData.toStation) {
      console.log("Validation failed: Same origin and destination")
      setError("Origin and destination stations cannot be the same")
      return
    }

    // Validate passengers
    const invalidPassenger = passengers.find((p) => !p.name || !p.age)
    if (invalidPassenger) {
      console.log("Validation failed: Incomplete passenger details", invalidPassenger)
      setError("Please fill in all passenger details")
      return
    }

    // Validate train selection
    if (!formData.selectedTrain) {
      console.log("Validation failed: No train selected")
      setError("Please select a train")
      return
    }

    try {
      console.log("Starting booking process...")
      setLoading(true)

      // Generate a random PNR (10 characters)
      const generatePNR = () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let result = ""
        for (let i = 0; i < 10; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        return result
      }

      // Generate a random payment ID (10 characters)
      const generatePaymentId = () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let result = "PAY"
        for (let i = 0; i < 7; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        return result
      }

      const pnr = generatePNR()
      const newPaymentId = generatePaymentId()
      setPaymentId(newPaymentId)

      const selectedTrain = formData.selectedTrain
      
      // Calculate total fare with concessions
      let totalFare = 0
      passengers.forEach(passenger => {
        const baseFare = selectedTrain.fare;
        const concessionRate = concessionRates[passenger.concessionType] || 0;
        const discountedFare = baseFare * (1 - concessionRate / 100);
        totalFare += discountedFare;
      });
      
      // Round to nearest integer
      totalFare = Math.round(totalFare);

      // Create a passenger ID for the booking user
      const bookingUserId = `P${Math.floor(Math.random() * 1000000)}`

      // Create passenger record for the booking user
      const createBookingUserQuery = `
        INSERT INTO passengers (passenger_id, name, phone_number)
        VALUES ('${bookingUserId}', '${user.username || "User"}', '0000000000')
        ON DUPLICATE KEY UPDATE name = '${user.username || "User"}'
      `

      console.log("Creating booking user passenger record with query:", createBookingUserQuery)
      const bookingUserResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: createBookingUserQuery,
        }),
      })

      const bookingUserData = await bookingUserResponse.json()
      console.log("Booking user creation response:", bookingUserData)

      if (!bookingUserResponse.ok || bookingUserData.status === "error") {
        throw new Error(bookingUserData.error || "Failed to create booking user record")
      }

      // Create payment record with pending status
      const createPaymentQuery = `
        INSERT INTO payment (payment_id, payment_status)
        VALUES ('${newPaymentId}', 'Pending')
      `

      console.log("Creating payment record with query:", createPaymentQuery)
      const paymentResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: createPaymentQuery,
        }),
      })

      const paymentData = await paymentResponse.json()
      console.log("Payment creation response:", paymentData)

      if (!paymentResponse.ok || paymentData.status === "error") {
        throw new Error(paymentData.error || "Failed to create payment record")
      }

      // Check if this is a waitlisted booking
      const isWaitlisted = selectedTrain.isWaitlisted
      let currentWaitlistNumber = null

      if (isWaitlisted) {
        // Get the next waitlist number
        currentWaitlistNumber = await getMaxWaitlistNumber(selectedTrain.train_number, formData.journeyDate)
        setWaitlistNumber(currentWaitlistNumber)
      }

      // Create ticket with appropriate status and waitlist number if applicable
      const createTicketQuery = `
        INSERT INTO tickets 
        (pnr, train_number, start_station_position, origin_station, 
         end_station_position, destination_station, travel_date, 
         total_fare, status, booked_by, payment_id${isWaitlisted ? ", waiting_list_number" : ""})
        VALUES 
        ('${pnr}', ${selectedTrain.train_number}, 
         (SELECT station_order FROM train_route_stations 
          WHERE train_route_id = ${selectedTrain.train_route_id} 
          AND station_id = ${formData.fromStation}),
         '${formData.fromStation}',
         (SELECT station_order FROM train_route_stations 
          WHERE train_route_id = ${selectedTrain.train_route_id} 
          AND station_id = ${formData.toStation}),
         '${formData.toStation}', 
         '${formData.journeyDate}', 
         ${totalFare}, '${isWaitlisted ? "Waitlisted" : "Confirmed"}', '${bookingUserId}', '${newPaymentId}'${isWaitlisted ? `, ${currentWaitlistNumber}` : ""})
      `

      console.log("Creating ticket with query:", createTicketQuery)
      const ticketResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: createTicketQuery,
        }),
      })

      const ticketData = await ticketResponse.json()
      console.log("Ticket creation response:", ticketData)

      if (!ticketResponse.ok || ticketData.status === "error") {
        throw new Error(ticketData.error || "Failed to create ticket")
      }

      // Only assign seats for confirmed bookings
      const assignedSeats = []

      if (!isWaitlisted) {
        // 2. Assign seats to passengers (only for confirmed bookings)
        // First, get available seats
        const getSeatsQuery = `
          SELECT seat_pool_id, seat_number 
          FROM available_seat_pool 
          WHERE train_route_id = ${selectedTrain.train_route_id}
          AND date = '${formData.journeyDate}'
          AND coach_id = '${selectedTrain.coach_id}'
          AND status = 'available'
          LIMIT ${passengers.length}
        `

        console.log("Getting available seats with query:", getSeatsQuery)
        const seatsResponse = await fetch("http://localhost:5000/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: getSeatsQuery,
          }),
        })

        const seatsData = await seatsResponse.json()
        console.log("Available seats response:", seatsData)

        if (
          !seatsResponse.ok ||
          seatsData.status === "error" ||
          !seatsData.results ||
          seatsData.results.length < passengers.length
        ) {
          throw new Error("Not enough seats available")
        }

        // 3. For each passenger, create passenger record if needed and assign seat
        for (let i = 0; i < passengers.length; i++) {
          const passenger = passengers[i]
          const seat = seatsData.results[i]
          
          // Calculate fare with concession for this passenger
          const baseFare = selectedTrain.fare;
          const concessionRate = concessionRates[passenger.concessionType] || 0;
          const discountedFare = Math.round(baseFare * (1 - concessionRate / 100));

          // Create or get passenger ID
          const passengerId = `P${Math.floor(Math.random() * 1000000)}`

          // Create passenger record
          const createPassengerQuery = `
            INSERT INTO passengers (passenger_id, name, phone_number)
            VALUES ('${passengerId}', '${passenger.name}', '0000000000')
            ON DUPLICATE KEY UPDATE name = '${passenger.name}'
          `

          console.log("Creating passenger with query:", createPassengerQuery)
          await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: createPassengerQuery,
            }),
          })

          // Create ticket_passengers record
          const createTicketPassengerQuery = `
            INSERT INTO ticket_passengers 
            (pnr, passenger_id, coach_number, seat_number, fare)
            VALUES 
            ('${pnr}', '${passengerId}', '${selectedTrain.coach_id}', 
             '${seat.seat_number}', ${discountedFare})
          `

          console.log("Creating ticket_passenger with query:", createTicketPassengerQuery)
          await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: createTicketPassengerQuery,
            }),
          })

          // Update seat status
          const updateSeatQuery = `
            UPDATE available_seat_pool
            SET status = 'booked', pnr = '${pnr}'
            WHERE seat_pool_id = ${seat.seat_pool_id}
          `

          console.log("Updating seat with query:", updateSeatQuery)
          await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: updateSeatQuery,
            }),
          })

          assignedSeats.push({
            passenger: passenger.name,
            seat: seat.seat_number,
            coach: selectedTrain.coach_id,
            concessionType: passenger.concessionType !== "none" ? passenger.concessionType : null,
            originalFare: selectedTrain.fare,
            discountedFare: discountedFare
          })
        }
      } else {
        // For waitlisted bookings, create passenger records without seat assignments
        for (let i = 0; i < passengers.length; i++) {
          const passenger = passengers[i]
          
          // Calculate fare with concession for this passenger
          const baseFare = selectedTrain.fare;
          const concessionRate = concessionRates[passenger.concessionType] || 0;
          const discountedFare = Math.round(baseFare * (1 - concessionRate / 100));

          // Create or get passenger ID
          const passengerId = `P${Math.floor(Math.random() * 1000000)}`

          // Create passenger record
          const createPassengerQuery = `
            INSERT INTO passengers (passenger_id, name, phone_number)
            VALUES ('${passengerId}', '${passenger.name}', '0000000000')
            ON DUPLICATE KEY UPDATE name = '${passenger.name}'
          `

          console.log("Creating passenger with query:", createPassengerQuery)
          await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: createPassengerQuery,
            }),
          })

          // Create ticket_passengers record without coach_number for waitlisted tickets
          const createTicketPassengerQuery = `
            INSERT INTO ticket_passengers 
            (pnr, passenger_id, fare)
            VALUES 
            ('${pnr}', '${passengerId}', ${discountedFare})
          `

          console.log("Creating waitlisted ticket_passenger with query:", createTicketPassengerQuery)
          await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: createTicketPassengerQuery,
            }),
          })

          assignedSeats.push({
            passenger: passenger.name,
            waitlisted: true,
            concessionType: passenger.concessionType !== "none" ? passenger.concessionType : null,
            originalFare: selectedTrain.fare,
            discountedFare: discountedFare
          })
        }
      }

      // Set booking details for confirmation
      setBookingDetails({
        pnr,
        paymentId: newPaymentId,
        train: selectedTrain.train_name,
        trainNumber: selectedTrain.train_number,
        from: stations.find((s) => s.station_id == formData.fromStation)?.station_city,
        to: stations.find((s) => s.station_id == formData.toStation)?.station_city,
        date: formData.journeyDate,
        departureTime: selectedTrain.departure_time,
        arrivalTime: selectedTrain.arrival_time,
        passengers: assignedSeats,
        totalFare,
        isWaitlisted,
        waitlistNumber: currentWaitlistNumber,
        isRAC: selectedTrain.isRAC,
      })

      // Start payment timer
      setPaymentStep(true)

      // Set up the 2-minute timer for payment
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer)
            // Handle payment timeout
            handlePaymentTimeout(pnr, newPaymentId)
            return 0
          }
          return prevTime - 1
        })
      }, 1000)

      setPaymentTimer(timer)
    } catch (err) {
      console.error("Booking error:", err)
      setError("Booking failed: " + err.message)
      setLoading(false)
    }
  }

  // Function to handle payment timeout
  const handlePaymentTimeout = async (pnr, paymentId) => {
    console.log("Payment timeout for PNR:", pnr)
    setError("Payment timeout. Your booking has been cancelled.")

    try {
      // Update payment status to Payment Timeout
      const updatePaymentQuery = `
        UPDATE payment
        SET payment_status = 'Payment Timeout'
        WHERE payment_id = '${paymentId}'
      `

      await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: updatePaymentQuery,
        }),
      })

      // Update ticket status to Payment Timeout
      const updateTicketQuery = `
        UPDATE tickets
        SET status = 'Payment Timeout'
        WHERE pnr = '${pnr}'
      `

      await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: updateTicketQuery,
        }),
      })

      // Delete ticket_passengers records
      const deleteTicketPassengersQuery = `
        DELETE FROM ticket_passengers
        WHERE pnr = '${pnr}'
      `

      await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: deleteTicketPassengersQuery,
        }),
      })

      // Release the booked seats
      const releaseSeatsQuery = `
        UPDATE available_seat_pool
        SET status = 'available', pnr = NULL
        WHERE pnr = '${pnr}'
      `

      await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: releaseSeatsQuery,
        }),
      })

      setPaymentStep(false)
      setLoading(false)
    } catch (err) {
      console.error("Error handling payment timeout:", err)
    }
  }

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (paymentTimer) {
        clearInterval(paymentTimer)
      }
    }
  }, [paymentTimer])

  // Add console log for step changes
  useEffect(() => {
    console.log("Current step changed to:", step)
  }, [step])

  // Add console log for form data changes
  useEffect(() => {
    console.log("Form data updated:", formData)
  }, [formData])

  // Add console log for passengers changes
  useEffect(() => {
    console.log("Passengers updated:", passengers)
  }, [passengers])

  return (
    <div className="page-container booking-page-container">
      <header className="page-header">
        <h1>Book Tickets</h1>
        <Link to="/dashboard" className="back-link">
          Back to Dashboard
        </Link>
      </header>

      {error && <div className="error-message">{error}</div>}

      {bookingComplete ? (
        <div className="booking-confirmation">
          <h2>
            {bookingDetails.isRAC
              ? "Booking Confirmed (RAC)!"
              : bookingDetails.isWaitlisted
              ? "Booking Waitlisted!"
              : "Booking Confirmed!"}
          </h2>

          {bookingDetails.isRAC && (
            <div
              style={{
                padding: "10px",
                margin: "10px 0",
                backgroundColor: "#fff3e0",
                border: "1px solid #ffcc80",
                borderRadius: "4px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#e65100", margin: "0 0 10px 0" }}>RAC Status</h3>
              <p style={{ margin: "0" }}>
                Your booking is confirmed with RAC status. You will be provided a shared berth and will be upgraded to a full berth if available.
              </p>
            </div>
          )}

          {bookingDetails.isWaitlisted && (
            <div
              style={{
                padding: "10px",
                margin: "10px 0",
                backgroundColor: "#fff3e0",
                border: "1px solid #ffcc80",
                borderRadius: "4px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#e65100", margin: "0 0 10px 0" }}>
                Waitlist Number: WL{bookingDetails.waitlistNumber}
              </h3>
              <p style={{ margin: "0" }}>
                Your booking is currently waitlisted. You will be automatically confirmed if seats become available.
              </p>
            </div>
          )}

          <div className="confirmation-details">
            <p>
              <strong>PNR:</strong> {bookingDetails.pnr}
            </p>
            <p>
              <strong>Payment ID:</strong> {bookingDetails.paymentId}
            </p>
            <p>
              <strong>Train:</strong> {bookingDetails.train} ({bookingDetails.trainNumber})
            </p>
            <p>
              <strong>From:</strong> {bookingDetails.from}
            </p>
            <p>
              <strong>To:</strong> {bookingDetails.to}
            </p>
            <p>
              <strong>Date:</strong> {bookingDetails.date}
            </p>
            <p>
              <strong>Departure:</strong> {bookingDetails.departureTime}
            </p>
            <p>
              <strong>Arrival:</strong> {bookingDetails.arrivalTime}
            </p>
            <p>
              <strong>Total Fare:</strong> ₹{bookingDetails.totalFare}
            </p>

            {bookingDetails.isWaitlisted && (
              <p style={{ color: "orange", fontWeight: "bold" }}>
                <strong>Status:</strong> Waitlisted (WL: {bookingDetails.waitlistNumber})
              </p>
            )}

            <h3>Passenger Details</h3>
            <table className="passenger-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {!bookingDetails.isWaitlisted && (
                    <>
                      <th>Coach</th>
                      <th>Seat</th>
                    </>
                  )}
                  <th>Concession</th>
                  <th>Fare</th>
                  {bookingDetails.isWaitlisted && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {bookingDetails.passengers.map((p, index) => (
                  <tr key={index}>
                    <td>{p.passenger}</td>
                    {!bookingDetails.isWaitlisted && (
                      <>
                        <td>{p.coach}</td>
                        <td>{p.seat}</td>
                      </>
                    )}
                    <td>
                      {p.concessionType === "senior" && "Senior Citizen"}
                      {p.concessionType === "student" && "Student"}
                      {p.concessionType === "pwd" && "Person with Disability"}
                      {!p.concessionType && "None"}
                    </td>
                    <td>
                      {p.discountedFare !== p.originalFare ? (
                        <>
                          <span style={{ textDecoration: 'line-through', marginRight: '5px', color: '#888' }}>
                            ₹{p.originalFare}
                          </span>
                          ₹{p.discountedFare}
                        </>
                      ) : (
                        <>₹{p.discountedFare}</>
                      )}
                    </td>
                    {bookingDetails.isWaitlisted && (
                      <td style={{ color: "orange" }}>Waitlisted (WL: {bookingDetails.waitlistNumber})</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="button-group">
              <Link to="/dashboard" className="submit-btn">
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : paymentStep ? (
        <div className="payment-screen">
          <h2>Complete Payment</h2>
          <div className="payment-details">
            <p>
              <strong>Payment ID:</strong> {paymentId}
            </p>
            <p>
              <strong>Amount:</strong> ₹{bookingDetails?.totalFare || 0}
            </p>
            <p>
              <strong>Time Remaining:</strong> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </p>

            <div className="form-group">
              <label>Payment Method</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="Credit">Credit Card</option>
                <option value="Debit">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="NetBanking">Net Banking</option>
              </select>
            </div>

            <div style={{ marginTop: "20px" }}>
              <a
                href="#"
                className="submit-btn"
                style={{
                  width: "100%",
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  padding: "10px",
                  backgroundColor: loading ? "#cccccc" : "#007bff",
                  color: "white",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                onClick={(e) => {
                  e.preventDefault()
                  console.log("Payment link clicked")

                  // Set loading state
                  setLoading(true)

                  // Clear the payment timer
                  if (paymentTimer) {
                    clearInterval(paymentTimer)
                    setPaymentTimer(null)
                  }

                  // Update payment status to Completed
                  const updatePaymentQuery = `
                    UPDATE payment
                    SET payment_status = 'Completed', payment_type = '${paymentType}'
                    WHERE payment_id = '${paymentId}'
                  `

                  console.log("Updating payment with query:", updatePaymentQuery)

                  fetch("http://localhost:5000/query", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      query: updatePaymentQuery,
                    }),
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      console.log("Payment update response:", data)

                      if (data.status === "error") {
                        throw new Error(data.error || "Failed to update payment")
                      }

                      setPaymentStep(false)
                      setBookingComplete(true)
                    })
                    .catch((err) => {
                      console.error("Payment error:", err)
                      setError("Payment failed: " + err.message)
                    })
                    .finally(() => {
                      setLoading(false)
                    })
                }}
              >
                {loading ? "Processing..." : "Complete Payment"}
              </a>
            </div>

            <p style={{ marginTop: "10px", textAlign: "center", color: "red" }}>
              Please complete payment before timer expires!
            </p>
          </div>
        </div>
      ) : (
        <form className="booking-form" onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <h2>Step 1: Select Journey Details</h2>

              <div className="form-group">
                <label>From Station</label>
                <select name="fromStation" value={formData.fromStation} onChange={handleFormChange} required>
                  <option value="">Select origin station</option>
                  {stations.map((station) => (
                    <option key={station.station_id} value={station.station_id}>
                      {station.station_city} ({station.station_abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>To Station</label>
                <select name="toStation" value={formData.toStation} onChange={handleFormChange} required>
                  <option value="">Select destination station</option>
                  {stations.map((station) => (
                    <option key={station.station_id} value={station.station_id}>
                      {station.station_city} ({station.station_abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Journey Date</label>
                <input
                  type="date"
                  name="journeyDate"
                  value={formData.journeyDate}
                  onChange={handleFormChange}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label>Coach Category</label>
                <select name="coachCategory" value={formData.coachCategory} onChange={handleFormChange} required>
                  {coachCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="coach-info">
                  <small>
                    AC1: First Class AC | AC2: Two-Tier AC | AC3: Three-Tier AC | Sleeper: Non-AC Sleeper | General:
                    Seating
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="submit-btn"
                disabled={loading}
                onClick={async (e) => {
                  e.preventDefault()
                  console.log("Search trains button clicked")
                  if (
                    !formData.fromStation ||
                    !formData.toStation ||
                    !formData.journeyDate ||
                    !formData.coachCategory
                  ) {
                    console.log("Validation failed: Missing journey details")
                    setError("Please fill in all journey details")
                    return
                  }

                  if (formData.fromStation === formData.toStation) {
                    console.log("Validation failed: Same origin and destination")
                    setError("Origin and destination stations cannot be the same")
                    return
                  }

                  // Perform train search here
                  try {
                    console.log("Starting train search for step 1...")
                    setLoading(true)

                    // First, find all train routes that match our criteria
                    const query1 = `
                       SELECT s1.train_route_id, s2.distance_from_origin - s1.distance_from_origin as distance, 
                           t.train_name, t.train_number, t.fare_multiplier,
                           TIME_FORMAT(s1.departure_time, '%H:%i') as departure_time, 
                           TIME_FORMAT(s2.arrival_time, '%H:%i') as arrival_time
                           FROM train_route_stations s1
                           JOIN train_route_stations s2 
                           ON s1.train_route_id = s2.train_route_id
                           JOIN train_routes s3
                           ON s1.train_route_id = s3.train_route_id
                           JOIN trains t
                           ON s3.train_number = t.train_number
                           WHERE s1.station_id = ${formData.fromStation}
                           AND s2.station_id = ${formData.toStation}
                           AND s1.station_order < s2.station_order
                           AND (WEEKDAY('${formData.journeyDate}') +1) = s3.start_day_of_week;
                    `

                    console.log("Executing query1:", query1)
                    const response_train_route = await fetch("http://localhost:5000/query", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        query: query1,
                      }),
                    })

                    const data_train_route = await response_train_route.json()
                    console.log("Train route query results:", data_train_route)

                    if (!response_train_route.ok || data_train_route.status === "error") {
                      throw new Error(data_train_route.error || "Failed to search train routes")
                    }

                    if (!data_train_route.results || data_train_route.results.length === 0) {
                      setError("No trains found for the selected route and date")
                      setLoading(false)
                      return
                    }

                    // For each train route, get available seats
                    const allTrains = []

                    for (const trainRoute of data_train_route.results) {
                      // First check for regular seats
                      const query2 = `
                        SELECT 
                          a.coach_id, 
                          c.coach_category, 
                          count(*) as available_seats,
                          c.base_fare_per_km
                        FROM available_seat_pool a
                        JOIN coaches c ON a.coach_id = c.coach_id
                        WHERE a.date = '${formData.journeyDate}'
                        AND a.train_route_id = ${trainRoute.train_route_id}
                        AND a.status = 'available'
                        AND c.coach_category = '${formData.coachCategory}'
                        GROUP BY a.coach_id, c.coach_category, c.base_fare_per_km;
                      `

                      console.log(`Executing seats query for train route ${trainRoute.train_route_id}:`, query2)
                      const seatsResponse = await fetch("http://localhost:5000/query", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          query: query2,
                        }),
                      })

                      const seatsData = await seatsResponse.json()
                      console.log(`Seats data for train route ${trainRoute.train_route_id}:`, seatsData)

                      // Calculate fare based on distance and fare_multiplier
                      const coachQuery = `
                        SELECT base_fare_per_km 
                        FROM coaches 
                        WHERE coach_category = '${formData.coachCategory}'
                        LIMIT 1;
                      `

                      console.log("Executing coach query:", coachQuery)
                      const coachResponse = await fetch("http://localhost:5000/query", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          query: coachQuery,
                        }),
                      })

                      const coachData = await coachResponse.json()
                      console.log("Coach data response:", coachData)

                      let baseFarePerKm = 1 // Default value
                      if (
                        coachResponse.ok &&
                        coachData.status !== "error" &&
                        coachData.results &&
                        coachData.results.length > 0
                      ) {
                        baseFarePerKm = coachData.results[0].base_fare_per_km
                      }

                      const calculatedFare = Math.round(
                        trainRoute.distance * baseFarePerKm * trainRoute.fare_multiplier,
                      )

                      if (
                        seatsResponse.ok &&
                        seatsData.status !== "error" &&
                        seatsData.results &&
                        seatsData.results.length > 0
                      ) {
                        // Add trains with available seats
                        const trainWithSeats = {
                          ...trainRoute,
                          ...seatsData.results[0], // Add seat information
                          fare: calculatedFare, // Add calculated fare
                          isWaitlisted: false, // Not waitlisted
                          isRAC: false // Not RAC
                        }
                        allTrains.push(trainWithSeats)
                      } else {
                        // Check for RAC seats if regular seats are full
                        const racQuery = `
                          SELECT 
                            a.coach_id, 
                            c.coach_category, 
                            count(*) as available_seats,
                            c.base_fare_per_km
                          FROM available_seat_pool a
                          JOIN coaches c ON a.coach_id = c.coach_id
                          WHERE a.date = '${formData.journeyDate}'
                          AND a.train_route_id = ${trainRoute.train_route_id}
                          AND a.status = 'available'
                          AND c.coach_category = 'RAC'
                          GROUP BY a.coach_id, c.coach_category, c.base_fare_per_km;
                        `

                        console.log(`Checking RAC seats for train route ${trainRoute.train_route_id}:`, racQuery)
                        const racResponse = await fetch("http://localhost:5000/query", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            query: racQuery,
                          }),
                        })

                        const racData = await racResponse.json()
                        console.log(`RAC data for train route ${trainRoute.train_route_id}:`, racData)

                        if (
                          racResponse.ok &&
                          racData.status !== "error" &&
                          racData.results &&
                          racData.results.length > 0
                        ) {
                          // Add train with RAC seats
                          const trainWithRAC = {
                            ...trainRoute,
                            ...racData.results[0], // Add RAC seat information
                            fare: Math.round(calculatedFare * 0.8), // RAC fare is 80% of regular fare
                            isWaitlisted: false, // Not waitlisted
                            isRAC: true // Mark as RAC
                          }
                          allTrains.push(trainWithRAC)
                        } else {
                          // If no RAC seats available, check for waitlist
                          const coachInfoQuery = `
                            SELECT coach_id
                            FROM coaches
                            WHERE train_number = ${trainRoute.train_number}
                            AND coach_category = '${formData.coachCategory}'
                            LIMIT 1;
                          `

                          console.log("Executing coach info query:", coachInfoQuery)
                          const coachInfoResponse = await fetch("http://localhost:5000/query", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              query: coachInfoQuery,
                            }),
                          })

                          const coachInfoData = await coachInfoResponse.json()
                          console.log("Coach info response:", coachInfoData)

                          if (
                            coachInfoResponse.ok &&
                            coachInfoData.status !== "error" &&
                            coachInfoData.results &&
                            coachInfoData.results.length > 0
                          ) {
                            // Get the waitlist number for this train
                            try {
                              // Get current waitlist position
                              const nextWaitlistNumber = await getMaxWaitlistNumber(
                                trainRoute.train_number,
                                formData.journeyDate,
                              )

                              // Add waitlisted train with waitlist number
                              const waitlistedTrain = {
                                ...trainRoute,
                                coach_id: coachInfoData.results[0].coach_id,
                                coach_category: formData.coachCategory,
                                available_seats: 0,
                                fare: calculatedFare,
                                isWaitlisted: true, // Mark as waitlisted
                                isRAC: false, // Not RAC
                                waitlistNumber: nextWaitlistNumber, // Add waitlist number
                              }
                              allTrains.push(waitlistedTrain)
                            } catch (wlError) {
                              console.error("Error getting waitlist number:", wlError)
                              // Still add the train but without waitlist number
                              const waitlistedTrain = {
                                ...trainRoute,
                                coach_id: coachInfoData.results[0].coach_id,
                                coach_category: formData.coachCategory,
                                available_seats: 0,
                                fare: calculatedFare,
                                isWaitlisted: true,
                                isRAC: false,
                              }
                              allTrains.push(waitlistedTrain)
                            }
                          }
                        }
                      }
                    }

                    if (allTrains.length > 0) {
                      console.log("Trains found (including waitlisted):", allTrains)
                      localStorage.setItem("availableTrains", JSON.stringify(allTrains))
                      setStep(2)
                    } else {
                      console.log("No trains found")
                      setError("No trains found for the selected criteria")
                    }
                  } catch (err) {
                    console.error("Search error:", err)
                    setError("Search failed: " + err.message)
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {loading ? "Searching..." : "Search Trains"}
              </button>
            </>
          ) : (
            <>
              <h2>Step 2: Select Train and Enter Passenger Details</h2>

              <div className="available-trains">
                <h3>Available Trains</h3>
                {JSON.parse(localStorage.getItem("availableTrains") || "[]").map((train, index) => (
                  <div
                    key={index}
                    className={`train-option ${formData.selectedTrain && formData.selectedTrain.train_route_id === train.train_route_id ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, selectedTrain: train })}
                    style={{
                      padding: "10px",
                      margin: "10px 0",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor:
                        formData.selectedTrain && formData.selectedTrain.train_route_id === train.train_route_id
                          ? "#e3f2fd"
                          : "white",
                    }}
                  >
                    <h4>
                      {train.train_name} ({train.train_number})
                    </h4>
                    <p>Distance: {train.distance} km</p>
                    <p>Departure: {train.departure_time}</p>
                    <p>Arrival: {train.arrival_time}</p>
                    {train.isRAC ? (
                      <>
                        <p style={{ color: "orange", fontWeight: "bold" }}>Status: RAC Available</p>
                        <p>Available RAC Seats: {train.available_seats}</p>
                      </>
                    ) : train.isWaitlisted ? (
                      <>
                        <p style={{ color: "orange", fontWeight: "bold" }}>Status: Waitlist Available</p>
                        <p style={{ color: "orange" }}>
                          Current WL:{" "}
                          {train.waitlistNumber ? (
                            train.waitlistNumber
                          ) : (
                            <span
                              onClick={async (e) => {
                                e.stopPropagation() // Prevent selecting the train
                                if (loading) return

                                try {
                                  setLoading(true)
                                  // Get current waitlist number for this train
                                  const nextWL = await getMaxWaitlistNumber(train.train_number, formData.journeyDate)

                                  // Update the train's waitlist number in localStorage
                                  const availableTrains = JSON.parse(localStorage.getItem("availableTrains") || "[]")
                                  const updatedTrains = availableTrains.map((t) => {
                                    if (t.train_number === train.train_number && t.isWaitlisted) {
                                      return { ...t, waitlistNumber: nextWL }
                                    }
                                    return t
                                  })
                                  localStorage.setItem("availableTrains", JSON.stringify(updatedTrains))

                                  // Force re-render
                                  setFormData({ ...formData })
                                } catch (err) {
                                  console.error("Error fetching waitlist number:", err)
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              style={{ textDecoration: "underline", cursor: "pointer" }}
                            >
                              {loading ? "Loading..." : "Click to check"}
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <p>Available Seats: {train.available_seats}</p>
                    )}
                    <p>Fare: ₹{train.fare} per passenger (before concessions)</p>
                  </div>
                ))}
              </div>

              <h3>Passenger Details</h3>

              {passengers.map((passenger, index) => (
                <div key={index} className="passenger-card">
                  <div className="passenger-header">
                    <h4>Passenger {index + 1}</h4>
                    {passengers.length > 1 && (
                      <button type="button" className="remove-passenger" onClick={() => removePassenger(index)}>
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={passenger.name}
                        onChange={(e) => handlePassengerChange(index, "name", e.target.value)}
                        placeholder="Passenger name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Age</label>
                      <input
                        type="number"
                        value={passenger.age}
                        onChange={(e) => handlePassengerChange(index, "age", e.target.value)}
                        placeholder="Age"
                        min="1"
                        max="120"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        value={passenger.gender}
                        onChange={(e) => handlePassengerChange(index, "gender", e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group concession-section">
                      <label>Concession Type</label>
                      <div className="concession-options">
                        <select
                          value={passenger.concessionType}
                          onChange={(e) => handlePassengerChange(index, "concessionType", e.target.value)}
                        >
                          <option value="none">None</option>
                          {parseInt(passenger.age) >= 60 ? (
                            <option value="senior">Senior Citizen (40% off)</option>
                          ) : (
                            <option value="senior" disabled>Senior Citizen (Age must be 60+)</option>
                          )}
                          <option value="student">Student (50% off)</option>
                          <option value="pwd">Person with Disability (75% off)</option>
                        </select>
                      </div>
                      
                      {passenger.concessionType !== "none" && formData.selectedTrain && (
                        <div className="concession-preview">
                          <p style={{marginTop: "5px", fontSize: "0.85em", color: "#28a745"}}>
                            Discounted fare: ₹{Math.round(formData.selectedTrain.fare * (1 - concessionRates[passenger.concessionType]/100))} 
                            (Original: ₹{formData.selectedTrain.fare})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="add-passenger" onClick={addPassenger}>
                + Add Passenger
              </button>

              <div className="button-group">
                <button type="button" className="back-btn" onClick={() => setStep(1)}>
                  Back to Journey Details
                </button>
                <button type="submit" className="submit-btn" disabled={loading || !formData.selectedTrain}>
                  {loading ? "Processing..." : "Book Tickets"}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  )
}

export default BookingPage
