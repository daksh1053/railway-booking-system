"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import "../styles/CancellationPage.css"

function CancellationPage({ user }) {
  const [pnr, setPnr] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [ticketDetails, setTicketDetails] = useState(null)

  const handleChange = (e) => {
    setPnr(e.target.value)
  }

  const retrieveBooking = async (e) => {
    e.preventDefault()

    if (!pnr || pnr.length !== 10) {
      setError("Please enter a valid 10-digit PNR number")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // First verify the ticket exists
      const checkPnrQuery = `SELECT t.*, 
                            s1.station_abbreviation as origin_name, 
                            s2.station_abbreviation as destination_name,
                            tr.train_name
                            FROM tickets t
                            JOIN stations s1 ON t.origin_station = s1.station_id
                            JOIN stations s2 ON t.destination_station = s2.station_id
                            JOIN trains tr ON t.train_number = tr.train_number
                            WHERE t.pnr = '${pnr}'`

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: checkPnrQuery,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to retrieve booking information")
      }

      if (data.results.length === 0) {
        throw new Error("No booking found with this PNR number")
      }

      const ticket = data.results[0]

      if (ticket.status === "Cancelled") {
        throw new Error("This ticket has already been cancelled")
      }

      setTicketDetails(ticket)
    } catch (err) {
      setError(err.message)
      setTicketDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const cancelTicket = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Store the train number from the ticket details before cancellation
      const trainNumber = ticketDetails.train_number

      const pnrDataQuery = `select train_route_id, date, coach_category
                                from available_seat_pool
                                natural join coaches
                                where pnr = '${pnr}'
                                group by train_route_id, date, coach_category;`

      const pnrDataResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: pnrDataQuery,
        }),
      })

      const pnrDataRes = await pnrDataResponse.json()
      console.log(pnrDataRes)

      if (!pnrDataResponse.ok || pnrDataRes.status === "error") {
        throw new Error(pnrDataRes.error || "Failed to retrieve PNR data")
      }

      const pnrData = pnrDataRes.results
      console.log(pnrData)

      if (pnrData.length === 0) {
        throw new Error("No PNR data found")
      }
      // Update the ticket status to Cancelled
      const cancelQuery = `UPDATE tickets 
                          SET status = 'Cancelled'
                          WHERE pnr = '${pnr}'`

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cancelQuery,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to cancel ticket")
      }

      setSuccess("Your ticket has been successfully cancelled and marked for refund")
      setTicketDetails(null)
      setPnr("")

      await waitlistUpgrade(pnrData, trainNumber)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const waitlistUpgrade = async (pnrData, trainNumber) => {
    try {
      const routeId = pnrData[0].train_route_id
      // Format the date properly for MySQL
      const dateObj = new Date(pnrData[0].date)
      const formattedDate = dateObj.toISOString().split("T")[0] // Format as YYYY-MM-DD
      const coachCategory = pnrData[0].coach_category

      console.log(
        `Processing upgrade for route ${routeId}, date ${formattedDate}, coach category ${coachCategory}, train ${trainNumber}`,
      )

      // Get count of available seats after cancellation
      const availSeatQuery = `SELECT count(*) as count FROM available_seat_pool asp
                              JOIN coaches c ON asp.coach_id = c.coach_id
                              WHERE asp.train_route_id = ${routeId}
                              AND asp.date = '${formattedDate}'
                              AND c.coach_category = '${coachCategory}'
                              AND asp.status = 'available';`

      const availSeatResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: availSeatQuery,
        }),
      })

      const availSeatRes = await availSeatResponse.json()

      if (!availSeatResponse.ok || availSeatRes.status === "error") {
        throw new Error(availSeatRes.error || "Failed to retrieve available seats")
      }

      const availableSeats = Number.parseInt(availSeatRes.results[0].count)
      console.log(`Available seats: ${availableSeats}`)

      if (availableSeats > 0) {
        // Find waitlisted tickets for this route, date and coach category
        const waitlistedQuery = `SELECT t.pnr, t.waiting_list_number 
                                FROM tickets t
                                WHERE t.train_number = (SELECT train_number FROM tickets WHERE pnr = '${pnr}')
                                AND t.travel_date = '${formattedDate}'
                                AND t.status = 'Waitlisted'
                                ORDER BY t.waiting_list_number
                                LIMIT ${availableSeats};`

        const waitlistedResponse = await fetch("http://localhost:5000/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: waitlistedQuery,
          }),
        })

        const waitlistedData = await waitlistedResponse.json()

        if (!waitlistedResponse.ok || waitlistedData.status === "error") {
          throw new Error(waitlistedData.error || "Failed to retrieve waitlisted tickets")
        }

        console.log("Waitlisted tickets to upgrade:", waitlistedData.results)

        // Upgrade waitlisted tickets to confirmed
        for (const ticket of waitlistedData.results) {
          // First, get the number of passengers for this ticket
          const passengerCountQuery = `SELECT COUNT(*) as passenger_count 
                                      FROM ticket_passengers 
                                      WHERE pnr = '${ticket.pnr}'`

          console.log("Getting passenger count with query:", passengerCountQuery)

          const passengerCountResponse = await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: passengerCountQuery,
            }),
          })

          const passengerCountData = await passengerCountResponse.json()

          if (!passengerCountResponse.ok || passengerCountData.status === "error") {
            console.error("Failed to get passenger count:", passengerCountData)
            throw new Error("Failed to get passenger count for ticket")
          }

          const passengerCount = Number.parseInt(passengerCountData.results[0].passenger_count)
          console.log(`Ticket ${ticket.pnr} has ${passengerCount} passengers`)

          // Get all available seats for this ticket
          const getAvailableSeatsQuery = `SELECT asp.seat_pool_id, asp.coach_id, asp.seat_number 
                                        FROM available_seat_pool asp
                                        JOIN coaches c ON asp.coach_id = c.coach_id
                                        WHERE asp.train_route_id = ${routeId}
                                        AND asp.date = '${formattedDate}'
                                        AND c.coach_category = '${coachCategory}'
                                        AND asp.status = 'available'
                                        LIMIT ${passengerCount};`

          const availableSeatsResponse = await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: getAvailableSeatsQuery,
            }),
          })

          const availableSeatsData = await availableSeatsResponse.json()

          if (
            !availableSeatsResponse.ok ||
            availableSeatsData.status === "error" ||
            availableSeatsData.results.length === 0
          ) {
            console.error("Available seats query failed:", availableSeatsData)
            console.warn(`No available seats for ticket ${ticket.pnr}, skipping upgrade`)
            continue // Skip this ticket and continue with the next one
          }

          const availableSeatsCount = availableSeatsData.results.length
          const canUpgradeAllPassengers = availableSeatsCount >= passengerCount

          console.log(
            `Found ${availableSeatsCount} available seats for ${passengerCount} passengers on ticket ${ticket.pnr}`,
          )

          if (!canUpgradeAllPassengers) {
            console.warn(
              `Not enough seats for all passengers on ticket ${ticket.pnr}. Available: ${availableSeatsCount}, Required: ${passengerCount}`,
            )
            // We'll do a partial upgrade - only upgrade passengers up to the number of available seats
            console.log(`Will upgrade ${availableSeatsCount} out of ${passengerCount} passengers`)
          }

          // Update ticket status to Confirmed if all passengers can be upgraded, otherwise keep as Waitlisted
          if (canUpgradeAllPassengers) {
            const upgradeQuery = `UPDATE tickets 
                                SET status = 'Confirmed', waiting_list_number = NULL
                                WHERE pnr = '${ticket.pnr}'`

            const upgradeResponse = await fetch("http://localhost:5000/query", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: upgradeQuery,
              }),
            })

            const upgradeData = await upgradeResponse.json()

            if (!upgradeResponse.ok || upgradeData.status === "error") {
              throw new Error(upgradeData.error || "Failed to upgrade waitlisted ticket")
            }
          }

          // Get all passenger IDs for this ticket
          const getPassengersQuery = `SELECT passenger_id 
                                     FROM ticket_passengers 
                                     WHERE pnr = '${ticket.pnr}'`

          console.log("Getting passengers with query:", getPassengersQuery)

          const passengersResponse = await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: getPassengersQuery,
            }),
          })

          const passengersData = await passengersResponse.json()

          if (!passengersResponse.ok || passengersData.status === "error") {
            console.error("Failed to get passengers:", passengersData)
            throw new Error("Failed to get passengers for ticket")
          }

          // Limit the number of passengers to upgrade based on available seats
          const passengersToUpgrade = Math.min(passengersData.results.length, availableSeatsData.results.length)
          console.log(`Upgrading ${passengersToUpgrade} passengers with available seats`)

          // Assign seats to as many passengers as possible
          for (let i = 0; i < passengersToUpgrade; i++) {
            const passenger = passengersData.results[i]
            const seat = availableSeatsData.results[i]

            // Assign seat to passenger
            const assignSeatQuery = `UPDATE ticket_passengers
                                   SET coach_number = '${seat.coach_id}', 
                                       seat_number = '${seat.seat_number}'
                                   WHERE pnr = '${ticket.pnr}'
                                   AND passenger_id = '${passenger.passenger_id}'`

            console.log(
              `Assigning seat ${seat.seat_number} in coach ${seat.coach_id} to passenger ${passenger.passenger_id}`,
            )

            const assignSeatResponse = await fetch("http://localhost:5000/query", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: assignSeatQuery,
              }),
            })

            const assignSeatData = await assignSeatResponse.json()

            if (!assignSeatResponse.ok || assignSeatData.status === "error") {
              console.error("Failed to assign seat to passenger:", assignSeatData)
              continue // Skip this passenger but try others
            }

            // Update seat status to booked
            try {
              const updateSeatQuery = `UPDATE available_seat_pool
                                     SET status = 'booked', pnr = '${ticket.pnr}'
                                     WHERE seat_pool_id = ${seat.seat_pool_id}`

              console.log("Updating seat status with query:", updateSeatQuery)

              const updateSeatResponse = await fetch("http://localhost:5000/query", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: updateSeatQuery,
                }),
              })

              const updateSeatData = await updateSeatResponse.json()

              if (!updateSeatResponse.ok || updateSeatData.status === "error") {
                console.error("Failed to update seat status:", updateSeatData)
              }
            } catch (updateError) {
              console.error("Error updating seat status:", updateError)
              // Continue with other passengers even if there's an error with one
            }
          }
        }

        // Update remaining waitlist numbers
        if (waitlistedData.results.length > 0) {
          try {
            // Count how many tickets were actually upgraded to Confirmed
            let upgradedTicketsCount = 0

            // Get the highest waiting list number from the upgraded tickets
            let maxUpgradedWaitingList = 0

            for (const ticket of waitlistedData.results) {
              // Check if this ticket was fully upgraded (all passengers got seats)
              const checkStatusQuery = `SELECT status FROM tickets WHERE pnr = '${ticket.pnr}'`

              const checkStatusResponse = await fetch("http://localhost:5000/query", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: checkStatusQuery,
                }),
              })

              const checkStatusData = await checkStatusResponse.json()

              if (
                checkStatusResponse.ok &&
                checkStatusData.status !== "error" &&
                checkStatusData.results.length > 0 &&
                checkStatusData.results[0].status === "Confirmed"
              ) {
                upgradedTicketsCount++

                // Track the highest waiting list number that was upgraded
                if (Number.parseInt(ticket.waiting_list_number) > maxUpgradedWaitingList) {
                  maxUpgradedWaitingList = Number.parseInt(ticket.waiting_list_number)
                }
              }
            }

            console.log(
              `Upgraded ${upgradedTicketsCount} tickets with waiting list numbers up to ${maxUpgradedWaitingList}`,
            )

            if (upgradedTicketsCount > 0) {
              // Update waiting list numbers for tickets with higher waiting list numbers
              const updateWaitlistQuery = `UPDATE tickets
                                          SET waiting_list_number = waiting_list_number - ${upgradedTicketsCount}
                                          WHERE train_number = '${trainNumber}'
                                          AND travel_date = '${formattedDate}'
                                          AND status = 'Waitlisted'
                                          AND waiting_list_number > ${maxUpgradedWaitingList}`

              console.log("Executing update waitlist query:", updateWaitlistQuery)

              const waitlistResponse = await fetch("http://localhost:5000/query", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: updateWaitlistQuery,
                }),
              })

              const waitlistData = await waitlistResponse.json()
              console.log("Update waitlist response:", waitlistData)

              if (!waitlistResponse.ok || waitlistData.status === "error") {
                console.error("Error updating waitlist numbers:", waitlistData)
                // Don't throw an error here as this is not critical - we've already upgraded the tickets
                console.warn("Could not update remaining waitlist numbers, but ticket upgrade was successful")
              } else {
                console.log(`Successfully updated waiting list numbers for ${waitlistData.affected_rows} tickets`)
              }
            } else {
              console.log(
                "No tickets were fully upgraded to Confirmed status, so no waiting list numbers need to be updated",
              )
            }
          } catch (waitlistError) {
            console.error("Error in waitlist number update:", waitlistError)
            // Don't throw an error here as this is not critical - we've already upgraded the tickets
            console.warn("Could not update remaining waitlist numbers, but ticket upgrade was successful")
          }
        }
      }
    } catch (err) {
      console.error("Error in waitlist upgrade:", err)
      setError(err.message)
    }
  }

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cancel Tickets</h1>
        <Link to="/dashboard" className="back-link">
          Back to Dashboard
        </Link>
      </header>

      <div className="cancellation-content">
        <h2>Cancel Your Booking</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={retrieveBooking}>
          <div className="form-group">
            <label>PNR Number</label>
            <input
              type="text"
              placeholder="Enter your 10-digit PNR number"
              value={pnr}
              onChange={handleChange}
              maxLength={10}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Processing..." : "Retrieve Booking"}
          </button>
        </form>

        {ticketDetails && (
          <div className="ticket-details">
            <h3>Ticket Information</h3>
            <div className="ticket-card">
              <div className="ticket-header">
                <div>
                  <strong>PNR: {ticketDetails.pnr}</strong>
                  <span className={`status ${ticketDetails.status?.toLowerCase()}`}>{ticketDetails.status}</span>
                </div>
                <div className="train-info">
                  <span>
                    {ticketDetails.train_number} | {ticketDetails.train_name}
                  </span>
                </div>
              </div>

              <div className="journey-details">
                <div className="station">
                  <div>
                    {ticketDetails.origin_name} ({ticketDetails.origin_station})
                  </div>
                </div>
                <div className="journey-line">
                  <span className="journey-date">{formatDate(ticketDetails.travel_date)}</span>
                </div>
                <div className="station">
                  <div>
                    {ticketDetails.destination_name} ({ticketDetails.destination_station})
                  </div>
                </div>
              </div>

              <div className="ticket-info">
                <div>Booking Date: {formatDate(ticketDetails.booking_date)}</div>
                <div>Total Fare: ₹{ticketDetails.total_fare}</div>
                <div>
                  Payment Status:
                  <span className={ticketDetails.payment_status?.toLowerCase()}>{ticketDetails.payment_status}</span>
                </div>
              </div>

              <div className="cancellation-warning">
                <p>
                  Warning: Cancellation is final and cannot be undone. A refund will be processed according to railway
                  cancellation policies.
                </p>
              </div>

              <div className="action-buttons">
                <button onClick={cancelTicket} className="cancel-btn" disabled={loading}>
                  {loading ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CancellationPage
