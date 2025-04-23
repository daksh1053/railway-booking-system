"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/ItemizedBillPage.css"

const ItemizedBillPage = () => {
  const [pnr, setPnr] = useState("")
  const [billDetails, setBillDetails] = useState(null)
  const [passengerDetails, setPassengerDetails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // SQL query to fetch main bill details
      const billQuery = `
        SELECT 
            t.pnr,
            t.train_number,
            tr.train_name,
            s1.station_city AS origin_city,
            s2.station_city AS destination_city,
            t.travel_date,
            t.booking_date,
            t.total_fare,
            p.payment_id,
            p.payment_status,
            p.payment_type,
            COUNT(tp.passenger_id) AS total_passengers,
            ROUND(t.total_fare * 0.05, 2) AS tax_amount,
            ROUND(t.total_fare * 0.02, 2) AS service_charge,
            ROUND(t.total_fare + (t.total_fare * 0.05) + (t.total_fare * 0.02), 2) AS grand_total
        FROM 
            tickets t
        JOIN 
            trains tr ON t.train_number = tr.train_number
        JOIN 
            stations s1 ON t.origin_station = s1.station_id
        JOIN 
            stations s2 ON t.destination_station = s2.station_id
        JOIN 
            payment p ON t.payment_id = p.payment_id
        LEFT JOIN 
            ticket_passengers tp ON t.pnr = tp.pnr
        WHERE 
            t.pnr = '${pnr}'
        GROUP BY 
            t.pnr, t.train_number, tr.train_name, s1.station_city, 
            s2.station_city, t.travel_date, t.booking_date, 
            t.total_fare, p.payment_id, p.payment_status, p.payment_type
      `

      // SQL query to fetch passenger details
      const passengerQuery = `
        SELECT 
            pa.name,
            pa.passenger_id,
            tp.coach_number,
            tp.seat_number,
            tp.fare,
            pa.concession_category,
            pa.concession_multiplier
        FROM 
            ticket_passengers tp
        JOIN 
            passengers pa ON tp.passenger_id = pa.passenger_id
        WHERE 
            tp.pnr = '${pnr}'
      `

      // Fetch bill details
      const billResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: billQuery,
        }),
      })

      const billData = await billResponse.json()

      if (!billResponse.ok || billData.status === "error") {
        throw new Error(billData.error || "Failed to fetch bill details")
      }

      if (billData.results.length === 0) {
        throw new Error("No ticket found with the provided PNR")
      }

      // Fetch passenger details
      const passengerResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: passengerQuery,
        }),
      })

      const passengerData = await passengerResponse.json()

      if (!passengerResponse.ok || passengerData.status === "error") {
        throw new Error(passengerData.error || "Failed to fetch passenger details")
      }

      setBillDetails(billData.results[0])
      setPassengerDetails(passengerData.results)
    } catch (err) {
      setError("Failed to fetch bill details: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  return (
    <div className="itemized-bill-page">
      <header className="page-header">
        <h1>Itemized Bill</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="pnr">PNR Number</label>
          <input
            id="pnr"
            type="text"
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            placeholder="Enter your PNR number"
            required
          />
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Generating..." : "Generate Bill"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {billDetails && (
        <div className="bill-container">
          <div className="bill-header">
            <h2>Railway E-Ticket Receipt</h2>
            <p className="bill-date">Generated on: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="bill-section">
            <h3>Booking Information</h3>
            <div className="bill-info-grid">
              <div className="bill-info-item">
                <span className="label">PNR Number:</span>
                <span className="value">{billDetails.pnr}</span>
              </div>
              <div className="bill-info-item">
                <span className="label">Train:</span>
                <span className="value">
                  {billDetails.train_name} ({billDetails.train_number})
                </span>
              </div>
              <div className="bill-info-item">
                <span className="label">Journey:</span>
                <span className="value">
                  {billDetails.origin_city} to {billDetails.destination_city}
                </span>
              </div>
              <div className="bill-info-item">
                <span className="label">Travel Date:</span>
                <span className="value">{formatDate(billDetails.travel_date)}</span>
              </div>
              <div className="bill-info-item">
                <span className="label">Booking Date:</span>
                <span className="value">{formatDate(billDetails.booking_date)}</span>
              </div>
              <div className="bill-info-item">
                <span className="label">Payment ID:</span>
                <span className="value">{billDetails.payment_id}</span>
              </div>
              <div className="bill-info-item">
                <span className="label">Payment Status:</span>
                <span className="value">{billDetails.payment_status}</span>
              </div>
              <div className="bill-info-item">
                <span className="label">Payment Method:</span>
                <span className="value">{billDetails.payment_type}</span>
              </div>
            </div>
          </div>

          {passengerDetails.length > 0 && (
            <div className="bill-section">
              <h3>Passenger Details</h3>
              <table className="passenger-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Passenger ID</th>
                    <th>Coach</th>
                    <th>Seat</th>
                    <th>Concession Type</th>
                    <th>Fare</th>
                  </tr>
                </thead>
                <tbody>
                  {passengerDetails.map((passenger, index) => (
                    <tr key={index}>
                      <td>{passenger.name}</td>
                      <td>{passenger.passenger_id}</td>
                      <td>{passenger.coach_number}</td>
                      <td>{passenger.seat_number}</td>
                      <td>{passenger.concession_category || "Regular"}</td>
                      <td>${passenger.fare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bill-section">
            <h3>Fare Breakdown</h3>
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Charge Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fare</td>
                  <td>${billDetails.total_fare}</td>
                </tr>
                <tr>
                  <td>Tax (5%)</td>
                  <td>${billDetails.tax_amount}</td>
                </tr>
                <tr>
                  <td>Service Charge (2%)</td>
                  <td>${billDetails.service_charge}</td>
                </tr>
                <tr className="total-row">
                  <td>
                    <strong>Grand Total</strong>
                  </td>
                  <td>
                    <strong>${billDetails.grand_total}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bill-footer">
            <p>Thank you for choosing our railway service!</p>
            <p className="terms">This is an electronic ticket. Please carry a valid ID proof during the journey.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemizedBillPage
