"use client"

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/CancelTrainPage.css"

const CancelTrainPage = ({ user }) => {
  const [trainNumber, setTrainNumber] = useState("")
  const [travelDate, setTravelDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [trainDetails, setTrainDetails] = useState(null)
  const [refundAmount, setRefundAmount] = useState(null)
  const [affectedPassengers, setAffectedPassengers] = useState(0)
  const navigate = useNavigate()

  // Format today's date as YYYY-MM-DD for min attribute
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!trainNumber || !travelDate) {
      setError("Please enter both train number and travel date")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")
    setTrainDetails(null)
    setRefundAmount(null)
    setAffectedPassengers(0)

    try {
      // First verify the train exists and get details
      const trainQuery = `SELECT t.*, 
                         (SELECT COUNT(*) FROM tickets 
                          WHERE train_number = ${trainNumber} 
                          AND travel_date = '${travelDate}'
                          AND status = 'Confirmed') as confirmed_passengers
                         FROM trains t
                         WHERE t.train_number = ${trainNumber}`

      const trainResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trainQuery }),
      })

      const trainData = await trainResponse.json()

      if (!trainResponse.ok || trainData.status === "error") {
        throw new Error(trainData.error || "Failed to retrieve train information")
      }

      if (trainData.results.length === 0) {
        throw new Error("No train found with this number")
      }

      // Get the refund amount using the specified query
      const refundQuery = `SELECT sum(total_fare) as total_refund_amount 
                          FROM tickets 
                          WHERE train_number=${trainNumber} 
                          AND status="Confirmed" 
                          AND travel_date="${travelDate}"`

      const refundResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: refundQuery }),
      })

      const refundData = await refundResponse.json()

      if (!refundResponse.ok || refundData.status === "error") {
        throw new Error(refundData.error || "Failed to calculate refund amount")
      }

      setTrainDetails(trainData.results[0])
      setRefundAmount(refundData.results[0].total_refund_amount || 0)
      setAffectedPassengers(trainData.results[0].confirmed_passengers || 0)

      // If there are no confirmed passengers, show a message
      if (trainData.results[0].confirmed_passengers === 0) {
        setSuccess("No confirmed bookings found for this train on the selected date. The train can be cancelled without any refunds.")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelTrain = async () => {
    if (!trainNumber || !travelDate || !trainDetails) {
      setError("Train details are missing. Please search for a train first.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // 1. Mark all tickets for this train and date as cancelled
      const updateTicketsQuery = `UPDATE tickets 
                                SET status = 'Cancelled' 
                                WHERE train_number = ${trainNumber} 
                                AND travel_date = '${travelDate}' 
                                AND status = 'Confirmed'`

      const updateTicketsResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: updateTicketsQuery }),
      })

      const updateTicketsData = await updateTicketsResponse.json()

      if (!updateTicketsResponse.ok || updateTicketsData.status === "error") {
        throw new Error(updateTicketsData.error || "Failed to update ticket statuses")
      }

      // 2. Insert cancellation records
      const insertCancellationsQuery = `INSERT INTO cancellations (
                                      pnr, cancellation_date, refund_amount, refund_status, 
                                      train_number, ticket_payment_id, journey_date
                                    )
                                    SELECT 
                                      pnr, 
                                      CURRENT_DATE(), 
                                      total_fare, 
                                      'Processed', 
                                      train_number, 
                                      payment_id, 
                                      travel_date
                                    FROM 
                                      tickets 
                                    WHERE 
                                      train_number = ${trainNumber} 
                                      AND travel_date = '${travelDate}' 
                                      AND status = 'Cancelled'
                                      AND pnr NOT IN (SELECT pnr FROM cancellations)`

      const insertCancellationsResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: insertCancellationsQuery }),
      })

      const insertCancellationsData = await insertCancellationsResponse.json()

      if (!insertCancellationsResponse.ok || insertCancellationsData.status === "error") {
        throw new Error(insertCancellationsData.error || "Failed to create cancellation records")
      }

      // 3. Update available seat pool to available
      const updateSeatsQuery = `UPDATE available_seat_pool asp
                               JOIN tickets t ON asp.pnr = t.pnr
                               SET asp.status = 'unavailable', asp.pnr = NULL
                               WHERE t.train_number = ${trainNumber}
                               AND t.travel_date = '${travelDate}'`

      const updateSeatsResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: updateSeatsQuery }),
      })

      const updateSeatsData = await updateSeatsResponse.json()

      if (!updateSeatsResponse.ok || updateSeatsData.status === "error") {
        throw new Error(updateSeatsData.error || "Failed to update seat statuses")
      }

      // 4. Create a train cancellation record (assuming a train_cancellations table exists)
      const insertTrainCancellationQuery = `INSERT INTO train_cancellations (
                                          train_number, 
                                          train_name,
                                          cancelled_date, 
                                          scheduled_date, 
                                          affected_passengers, 
                                          total_refund_amount,
                                          cancelled_by
                                        ) VALUES (
                                          ${trainNumber},
                                          '${trainDetails.train_name}',
                                          CURRENT_DATE(), 
                                          '${travelDate}', 
                                          ${affectedPassengers || 0}, 
                                          ${refundAmount || 0},
                                          '${user && user.username ? user.username : 'admin'}'
                                        )`

      const insertTrainCancellationResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: insertTrainCancellationQuery }),
      })

      const insertTrainCancellationData = await insertTrainCancellationResponse.json()

      if (!insertTrainCancellationResponse.ok || insertTrainCancellationData.status === "error") {
        // If this table doesn't exist, we'll just log the error but continue
        console.error("Could not insert train cancellation record:", insertTrainCancellationData.error)
      }

      setSuccess(`Train ${trainNumber} for ${travelDate} has been successfully cancelled. ${affectedPassengers} passenger(s) affected with a total refund amount of ₹${refundAmount || 0}.`)
      setTrainDetails(null)
      setTrainNumber("")
      setTravelDate("")
      setRefundAmount(null)
      setAffectedPassengers(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cancel-train-page">
      <header className="page-header">
        <h1>Cancel Train Service</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="cancel-train-container">
        <form onSubmit={handleSubmit} className="train-search-form">
          <div className="form-group">
            <label htmlFor="trainNumber">Train Number</label>
            <input
              type="number"
              id="trainNumber"
              value={trainNumber}
              onChange={(e) => setTrainNumber(e.target.value)}
              placeholder="Enter train number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="travelDate">Travel Date</label>
            <input
              type="date"
              id="travelDate"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              min={today}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search Train"}
          </button>
        </form>

        {trainDetails && (
          <div className="train-details">
            <h2>Train Details</h2>
            <div className="train-info-card">
              <div className="train-header">
                <span className="train-number">{trainDetails.train_number}</span>
                <span className="train-name">{trainDetails.train_name}</span>
              </div>
              
              <div className="cancellation-details">
                <div className="detail-row">
                  <span>Scheduled Date:</span>
                  <span>{travelDate}</span>
                </div>
                <div className="detail-row">
                  <span>Affected Passengers:</span>
                  <span>{affectedPassengers}</span>
                </div>
                <div className="detail-row total-refund">
                  <span>Total Refund Amount:</span>
                  <span>₹{refundAmount || 0}</span>
                </div>
              </div>

              <div className="cancellation-warning">
                <p>Warning: Cancelling a train is a significant action that affects all passengers with confirmed bookings.
                   All tickets will be automatically cancelled and marked for refunds.</p>
              </div>

              <button 
                className="cancel-train-btn" 
                onClick={cancelTrain} 
                disabled={loading}
              >
                {loading ? "Processing..." : "Cancel This Train"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CancelTrainPage