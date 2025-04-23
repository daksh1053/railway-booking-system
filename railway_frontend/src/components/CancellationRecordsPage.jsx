"use client"

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/CancellationRecordsPage.css"

const CancellationRecordsPage = ({ user }) => {
  const [cancellationRecords, setCancellationRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchCancellationRecords = async () => {
    setLoading(true)
    setError(null)

    try {
      // Updated SQL query to fetch all cancellation details
      const query = `
        SELECT * FROM cancellations
        ORDER BY cancellation_date DESC
      `

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch cancellation records")
      }

      setCancellationRecords(data.results || [])
    } catch (err) {
      setError("Failed to fetch cancellation records: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchCancellationRecords()
  }, [])

  return (
    <div className="cancellation-records-page">
      <header className="page-header">
        <h1>Cancellation Records</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="records-container">
          {cancellationRecords.length === 0 ? (
            <p>No cancellation records found.</p>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>Cancellation ID</th>
                  <th>PNR</th>
                  <th>Cancellation Date</th>
                  <th>Refund Amount</th>
                  <th>Refund Status</th>
                  <th>Train Number</th>
                  <th>Ticket Payment ID</th>
                  <th>Journey Date</th>
                </tr>
              </thead>
              <tbody>
                {cancellationRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{record.cancellation_id}</td>
                    <td>{record.pnr}</td>
                    <td>{record.cancellation_date}</td>
                    <td>${record.refund_amount}</td>
                    <td>{record.refund_status}</td>
                    <td>{record.train_number}</td>
                    <td>{record.ticket_payment_id}</td>
                    <td>{record.journey_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default CancellationRecordsPage
