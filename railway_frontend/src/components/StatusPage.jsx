"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import "../styles/StatusPage.css"

function StatusPage({ user }) {
  const [pnr, setPnr] = useState("")
  const [bookingData, setBookingData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handlePnrChange = (e) => {
    setPnr(e.target.value)
  }

  const checkStatus = async () => {
    if (!pnr || pnr.length !== 10) {
      setError("Please enter a valid 10-digit PNR number")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Call the stored procedure using the same API pattern as LoginPage
      const pnrQuery = `CALL get_pnr_status('${pnr}')`

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: pnrQuery,
        }),
      })

      const data = await response.json()
      console.log(data) // Keep for debugging

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch booking information")
      }

      // Based on your console log, data comes in a different format than expected
      if (data.results && data.results.length > 0) {
        setBookingData(data.results[0])
      } else {
        throw new Error("No booking found with this PNR")
      }
    } catch (err) {
      setError(err.message || "Failed to fetch booking information")
      setBookingData(null)
    } finally {
      setLoading(false)
    }
  }

  // Function to format date string
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
        <h1>PNR Status Check</h1>
        <Link to="/dashboard" className="back-link">
          Back to Dashboard
        </Link>
      </header>

      <div className="status-content">
        <h2>Check Your PNR Status</h2>

        <div className="form-group">
          <label>PNR Number</label>
          <input
            type="text"
            placeholder="Enter your 10-digit PNR number"
            value={pnr}
            onChange={handlePnrChange}
            maxLength={10}
          />
        </div>

        <button type="button" className="submit-btn" onClick={checkStatus} disabled={loading}>
          {loading ? "Checking..." : "Check Status"}
        </button>

        {error && <div className="error-message">{error}</div>}

        {bookingData && (
          <div className="booking-details">
            <h3>Booking Information</h3>
            <div className="booking-card">
              <div className="booking-header">
                <div>
                  <strong>PNR: {bookingData.pnr}</strong>
                  <span className={`status ${bookingData.status?.toLowerCase()}`}>
                    {bookingData.status || "Unknown"}
                  </span>
                  {bookingData.waiting_list_number && (
                    <span className="waiting-list">WL: {bookingData.waiting_list_number}</span>
                  )}
                </div>
                <div className="train-info">
                  <span>
                    {bookingData.train_number} | {bookingData.train_name}
                  </span>
                </div>
              </div>
              <div className="journey-details">
                <div className="station">
                  <div>
                    {bookingData.origin_city} ({bookingData.origin_id})
                  </div>
                </div>
                <div className="journey-line">
                  <span className="journey-date">{formatDate(bookingData.travel_date)}</span>
                </div>
                <div className="station">
                  <div>
                    {bookingData.destination_city} ({bookingData.destination_id})
                  </div>
                </div>
              </div>
              <div className="booking-info">
                <div>Booking Date: {formatDate(bookingData.booking_date)}</div>
                <div>Total Fare: ₹{bookingData.total_fare || "N/A"}</div>
                <div>
                  Payment Status:
                  <span className={bookingData.payment_status?.toLowerCase() || ""}>
                    {bookingData.payment_status || "Unknown"}
                  </span>
                </div>
              </div>

              {/* Note: We're not showing passenger details since they're not available in current response */}
              {/* If you need to show passenger data, you'll need to modify the stored procedure or 
                  create a separate API call to fetch passenger information */}
              <div className="note-message">
                <p>
                  Note: For detailed passenger information, please check your email confirmation or contact customer
                  support.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusPage
