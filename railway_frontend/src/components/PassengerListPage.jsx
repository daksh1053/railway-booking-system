"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/PassengerListPage.css"

const PassengerListPage = ({ user }) => {
  const [trainNumber, setTrainNumber] = useState("")
  const [travelDate, setTravelDate] = useState("")
  const [passengers, setPassengers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // SQL query to get passengers for a specific train on a specific date

      const query = `
        SELECT 
          passenger_id,
          pnr,
          coach_number,
          seat_number,
          name,
          booked_time,
          status
        FROM ticket_passengers 
        NATURAL JOIN tickets 
        NATURAL JOIN passengers 
        WHERE travel_date='${travelDate}' 
        AND train_number=${trainNumber}
        ORDER BY coach_number, seat_number;
      `

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

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch passengers")
      }

      setPassengers(data.results || [])
      setSearched(true)
    } catch (err) {
      setError("Failed to fetch passenger data: " + err.message)
      console.error("Error fetching passenger data:", err)
    } finally {
      setLoading(false)
    }
  }

  const goToDashboard = () => {
    navigate("/dashboard")
  }

  return (
    <div className="passenger-list-container">
      <h1>Train Passenger List</h1>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="trainNumber">Train Number:</label>
          <input
            type="text"
            id="trainNumber"
            value={trainNumber}
            onChange={(e) => setTrainNumber(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="travelDate">Travel Date:</label>
          <input
            type="date"
            id="travelDate"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Searching..." : "Search Passengers"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {searched && !loading && (
        <div className="results-container">
          <h2>
            Passengers on Train {trainNumber} on {travelDate}
          </h2>

          {passengers.length === 0 ? (
            <p>No passengers found for this train and date.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>Passenger Name</th>
                  <th>Coach</th>
                  <th>Seat</th>
                  <th>Booking Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((passenger, index) => (
                  <tr key={index}>
                    <td>{passenger.pnr}</td>
                    <td>{passenger.name}</td>
                    <td>{passenger.coach_number}</td>
                    <td>{passenger.seat_number}</td>
                    <td>{new Date(passenger.booked_time).toLocaleString()}</td>
                    <td>{passenger.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <button className="back-button" onClick={goToDashboard}>
        Back to Dashboard
      </button>
    </div>
  )
}

export default PassengerListPage
