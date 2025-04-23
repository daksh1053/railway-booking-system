"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/AvailableSeatsPage.css"

const AvailableSeatsPage = () => {
  const [trainNumber, setTrainNumber] = useState("")
  const [journeyDate, setJourneyDate] = useState("")
  const [coachClass, setCoachClass] = useState("Sleeper")
  const [seatCounts, setSeatCounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  // Coach categories
  const coachCategories = ["AC1", "AC2", "AC3", "Sleeper", "General"]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Query to get the count of available seats by coach with category and fare information
      const seatCountQuery = `
        SELECT 
          asp.coach_id, 
          c.coach_category, 
          COUNT(*) AS available_seat_count,
          c.base_fare_per_km
        FROM 
          available_seat_pool asp
        JOIN 
          coaches c ON asp.coach_id = c.coach_id
        JOIN 
          train_routes tr ON asp.train_route_id = tr.train_route_id
        WHERE 
          tr.train_number = '${trainNumber}'
          AND asp.date = '${journeyDate}'
          AND c.coach_category = '${coachClass}'
          AND asp.status = 'available'
        GROUP BY 
          asp.coach_id, c.coach_category, c.base_fare_per_km
      `

      const countResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: seatCountQuery }),
      })

      const countData = await countResponse.json()

      if (!countResponse.ok || countData.status === "error") {
        throw new Error(countData.error || "Failed to fetch seat counts")
      }

      // Set the seat count data
      const seatCounts = countData.results || []
      setSeatCounts(seatCounts)
      setSearched(true)
    } catch (err) {
      setError("Failed to fetch seat data: " + err.message)
      console.error("Error fetching available seats:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="available-seats-page">
      <header className="page-header">
        <h1>Available Seats</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="trainNumber">Train Number:</label>
          <input
            type="text"
            id="trainNumber"
            value={trainNumber}
            onChange={(e) => setTrainNumber(e.target.value)}
            placeholder="Enter train number"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="journeyDate">Journey Date:</label>
          <input
            type="date"
            id="journeyDate"
            value={journeyDate}
            onChange={(e) => setJourneyDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="coachClass">Coach Class:</label>
          <select id="coachClass" value={coachClass} onChange={(e) => setCoachClass(e.target.value)} required>
            {coachCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div className="coach-info">
            <small>
              AC1: First Class AC | AC2: Two-Tier AC | AC3: Three-Tier AC | Sleeper: Non-AC Sleeper | General: Seating
            </small>
          </div>
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Searching..." : "Find Available Seats"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-indicator">Searching for available seats...</div>}

      {searched && !loading && (
        <div className="results-container">
          <h2>
            Available Seats for Train {trainNumber} on {journeyDate}
          </h2>

          {seatCounts.length === 0 ? (
            <div className="no-results">
              <p>No available seats found for this train, date and class.</p>
              <p>Try searching with different criteria or contact customer support.</p>
            </div>
          ) : (
            <div className="seat-count-summary">
              <div className="summary-header">
                <h3>Seat Availability Summary - {coachClass} Class</h3>
                <div className="total-seats">
                  Total Available:{" "}
                  <span>
                    {seatCounts.reduce((total, count) => total + Number.parseInt(count.available_seat_count), 0)}
                  </span>
                </div>
              </div>

              <div className="count-table-container">
                <table className="count-table">
                  <thead>
                    <tr>
                      <th>Coach ID</th>
                      <th>Coach Type</th>
                      <th>Available Seats</th>
                      <th>Base Fare (per km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seatCounts.map((count, index) => (
                      <tr key={index}>
                        <td>{count.coach_id}</td>
                        <td>{count.coach_category}</td>
                        <td className="seat-count">{count.available_seat_count}</td>
                        <td className="fare">₹{count.base_fare_per_km}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="booking-info">
                <p>To book these seats, please proceed to the booking page.</p>
                <button
                  className="booking-button"
                  onClick={() =>
                    navigate("/booking", {
                      state: {
                        trainNumber,
                        journeyDate,
                        coachClass,
                      },
                    })
                  }
                >
                  Proceed to Booking
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AvailableSeatsPage
