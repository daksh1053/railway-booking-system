"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/BusiestRoutePage.css"

const BusiestRoutePage = () => {
  const [busiestRoutes, setBusiestRoutes] = useState([])
  const [stationDetails, setStationDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchBusiestRoutes = async () => {
      try {
        // SQL query to find the busiest routes based on booked seats
        const busiestRouteQuery = `
          SELECT train_routes.route_id, COUNT(*) as booked_seats
          FROM available_seat_pool
          JOIN train_routes ON available_seat_pool.train_route_id = train_routes.train_route_id
          WHERE status = 'booked'
          GROUP BY train_routes.route_id
          HAVING COUNT(*) = (
              SELECT COUNT(*) as seat_count
              FROM available_seat_pool
              JOIN train_routes ON available_seat_pool.train_route_id = train_routes.train_route_id
              WHERE status = 'booked'
              GROUP BY train_routes.route_id
              ORDER BY seat_count DESC
              LIMIT 1
          )
          ORDER BY booked_seats DESC
        `

        const response = await fetch("http://localhost:5000/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: busiestRouteQuery,
          }),
        })

        const data = await response.json()

        if (!response.ok || data.status === "error") {
          throw new Error(data.error || "Failed to fetch busiest route data")
        }

        const routes = data.results || []
        setBusiestRoutes(routes)

        // Fetch station details for each route
        if (routes.length > 0) {
          await fetchStationDetails(routes.map((r) => r.route_id))
        }
      } catch (err) {
        setError("Failed to fetch busiest route data: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiestRoutes()
  }, [])

  const fetchStationDetails = async (routeIds) => {
    try {
      // SQL query to get station details for the routes
      const stationQuery = `
        SELECT 
          r.route_id,
          origin.station_id as origin_id,
          origin.station_city as origin_city,
          origin.station_state as origin_state,
          dest.station_id as destination_id,
          dest.station_city as destination_city,
          dest.station_state as destination_state
        FROM routes r
        JOIN stations origin ON r.origin_station = origin.station_id
        JOIN stations dest ON r.destination_station = dest.station_id
        WHERE r.route_id IN (${routeIds.map((id) => `'${id}'`).join(",")})
      `

      const response = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: stationQuery,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.status === "error") {
        throw new Error(data.error || "Failed to fetch station details")
      }

      // Convert to a lookup object by route_id
      const details = {}
      ;(data.results || []).forEach((station) => {
        details[station.route_id] = station
      })

      setStationDetails(details)
    } catch (err) {
      console.error("Error fetching station details:", err)
      // Don't set error state here, as we still want to show the routes
    }
  }

  const getStationInfo = (routeId) => {
    const details = stationDetails[routeId]
    if (!details) return null

    return (
      <div className="route-stations">
        <div className="station origin">
          <span className="station-label">From:</span>
          <span className="station-name">
            {details.origin_city}, {details.origin_state}
          </span>
          <span className="station-id">({details.origin_id})</span>
        </div>
        <div className="route-arrow">→</div>
        <div className="station destination">
          <span className="station-label">To:</span>
          <span className="station-name">
            {details.destination_city}, {details.destination_state}
          </span>
          <span className="station-id">({details.destination_id})</span>
        </div>
      </div>
    )
  }

  return (
    <div className="busiest-route-page">
      <header className="page-header">
        <h1>Busiest Routes</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      {loading && <div className="loading-spinner">Loading...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && busiestRoutes.length === 0 && (
        <div className="no-data-message">
          <p>No route data available at this time.</p>
        </div>
      )}

      {busiestRoutes.length > 0 && (
        <div className="results-container">
          <h2>Busiest Routes by Booked Seats</h2>
          <div className="routes-grid">
            {busiestRoutes.map((route, index) => (
              <div key={index} className="route-card">
                <div className="route-name">Route {route.route_id}</div>
                {getStationInfo(route.route_id) || <div className="route-id">Route ID: {route.route_id}</div>}
                <div className="seat-count">
                  <span className="count-number">{route.booked_seats}</span>
                  <span className="count-label">Booked Seats</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BusiestRoutePage
