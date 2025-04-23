"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/WaitlistPage.css"

const WaitlistPage = ({ user }) => {
  const [trainNumber, setTrainNumber] = useState("")
  const [travelDate, setTravelDate] = useState("")
  const [waitlistedPassengers, setWaitlistedPassengers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const waitlistQuery = `
        SELECT * from tickets natural join ticket_passengers natural join 
        passengers where
        train_number = '${trainNumber}' 
        AND travel_date = '${travelDate}'
        AND status = 'waitlisted'
        ORDER BY waiting_list_number ASC
      `

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: waitlistQuery,
        }),
      })

      const data = await response.json()
      console.log(data)

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch waitlisted passengers")
      }

      setWaitlistedPassengers(data.results || [])
      setSearched(true)
    } catch (err) {
      setError("Failed to fetch waitlist data: " + err.message)
      console.error("Error fetching waitlist data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="waitlist-page">
      <header className="page-header">
        <h1>Waitlisted Passengers</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="train-number">Train Number</label>
          <input
            id="train-number"
            type="text"
            value={trainNumber}
            onChange={(e) => setTrainNumber(e.target.value)}
            placeholder="Enter train number"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="travel-date">Travel Date</label>
          <input
            id="travel-date"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Searching..." : "Search Waitlist"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {searched && !loading && (
        <div className="results-container">
          <h2>
            Waitlisted Passengers on Train {trainNumber} for {formatDisplayDate(travelDate)}
          </h2>

          {waitlistedPassengers.length === 0 ? (
            <p>No waitlisted passengers found for this train and date.</p>
          ) : (
            <div className="waitlist-results">
              {waitlistedPassengers.map((passenger, index) => (
                <div key={index} className="passenger-card">
                  <div className="passenger-header">
                    <span className="pnr">PNR: {passenger.pnr}</span>
                    <span className="waitlist-position">WL {passenger.waiting_list_number}</span>
                  </div>

                  <div className="passenger-details">
                    <div className="detail-row">
                      <span className="detail-label">Passenger:</span>
                      <span className="detail-value">
                        {passenger.name} (ID: {passenger.passenger_id})
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Route:</span>
                      <span className="detail-value">
                        Station {passenger.origin_station} (Pos: {passenger.start_station_position}) → Station{" "}
                        {passenger.destination_station} (Pos: {passenger.end_station_position})
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Fare:</span>
                      <span className="detail-value">₹{passenger.total_fare}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Booked By:</span>
                      <span className="detail-value">
                        {passenger.booked_by} at {new Date(passenger.booked_time).toLocaleString()}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge ${passenger.status.toLowerCase()}`}>{passenger.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WaitlistPage
