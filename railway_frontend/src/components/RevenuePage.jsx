"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/RevenuePage.css"
import CountUp from "./CountUp"
const RevenuePage = () => {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // SQL query to calculate total revenue between start and end dates
      const revenueQuery = `
      SELECT SUM(total_fare) as  totalRevenue 
        FROM tickets 
        WHERE travel_date BETWEEN '${startDate}' AND '${endDate}' 
        AND status = 'Confirmed';

      
      `

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: revenueQuery,
        }),
      })

      const data = await response.json()
      console.log(data)
      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch revenue data")
      }

      setRevenue(data.results[0]?.totalRevenue || 0)
    } catch (err) {
      setError("Failed to fetch revenue data: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="revenue-page">
      <header className="page-header">
        <h1>Total Revenue</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-date">End Date</label>
          <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Calculating..." : "Calculate Revenue"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {revenue !== null && (
        <div className="results-container">
          <h2>Total Revenue</h2>
          <p>
            The total revenue generated from {startDate} to {endDate} is:
          </p>
          <h3>
            {<CountUp from={0} to={revenue} separator="," direction="up" duration={1} className="count-up-text" />}
          </h3>
        </div>
      )}
    </div>
  )
}

export default RevenuePage
