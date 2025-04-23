"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/TrainSchedulePage.css"

const TrainSchedulePage = ({ user }) => {
  const [trainNumber, setTrainNumber] = useState("")
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // First query: Get active train routes for the train number
      const routesQuery = `
        SELECT train_route_id, start_day_of_week, end_day_of_week
        FROM train_routes
        WHERE train_number = '${trainNumber}'
        AND active = 1
      `
      
      const routesResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: routesQuery,
        }),
      })
      
      const routesData = await routesResponse.json()
      if (!routesResponse.ok || routesData.status === "error") {
        throw new Error(routesData.error || "Failed to fetch train routes")
      }
      
      if (!routesData.results || routesData.results.length === 0) {
        setSchedule([])
        setSearched(true)
        setLoading(false)
        return
      }
      
      // Get route IDs for the second query
      const routeIds = routesData.results.map(route => route.train_route_id)
      
      // Second query: Get station details for these routes
      const stationsQuery = `
        SELECT 
          CAST(arrival_time AS CHAR) as arrival_time, 
          CAST(departure_time AS CHAR) as departure_time, 
          station_id,
          train_route_id,
          station_order
        FROM train_route_stations
        WHERE train_route_id IN (${routeIds.join(',')})
        ORDER BY train_route_id, station_order
      `
      
      const stationsResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: stationsQuery,
        }),
      })
      
      const stationsData = await stationsResponse.json()
      if (!stationsResponse.ok || stationsData.status === "error") {
        throw new Error(stationsData.error || "Failed to fetch station details")
      }
      
      // Get unique station IDs for the third query
      const stationIds = [...new Set(stationsData.results.map(station => station.station_id))]
      
      // Third query: Get station information
      const stationInfoQuery = `
        SELECT station_id, station_abbreviation, station_city
        FROM stations
        WHERE station_id IN (${stationIds.join(',')})
      `
      
      const stationInfoResponse = await fetch("http://localhost:5000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: stationInfoQuery,
        }),
      })
      
      const stationInfoData = await stationInfoResponse.json()
      if (!stationInfoResponse.ok || stationInfoData.status === "error") {
        throw new Error(stationInfoData.error || "Failed to fetch station information")
      }
      
      // Create a map of station information for easy lookup
      const stationMap = {}
      stationInfoData.results.forEach(station => {
        stationMap[station.station_id] = station
      })
      
      // Create a map of route information for easy lookup
      const routeMap = {}
      routesData.results.forEach(route => {
        routeMap[route.train_route_id] = route
      })
      
      // Combine the data to create the final schedule
      const combinedSchedule = stationsData.results.map(stop => {
        const route = routeMap[stop.train_route_id]
        const station = stationMap[stop.station_id]
        
        return {
          ...stop,
          ...station,
          start_day: route.start_day_of_week,
          end_day: route.end_day_of_week
        }
      })
      
      setSchedule(combinedSchedule || [])
      setSearched(true)
    } catch (err) {
      setError("Failed to fetch train schedule: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Function to determine if a station is source or destination
  const isSource = (stop) => stop.arrival_time === null
  const isDestination = (stop) => stop.departure_time === null

  return (
    <div className="train-schedule-page">
      <header className="page-header">
        <h1>Train Schedule</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>
      
      <form className="search-form" onSubmit={handleSearch}>
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
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Searching..." : "Find Schedule"}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      {searched && !loading && (
        <div className="results-container">
          <h2>Schedule for Train {trainNumber}</h2>
          {schedule.length === 0 ? (
            <p>No schedule found for this train.</p>
          ) : (
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Code</th>
                  <th>Days</th>
                  <th>Arrival</th>
                  <th>Departure</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((stop, index) => (
                  <tr key={index} className={isSource(stop) ? "source-station" : isDestination(stop) ? "destination-station" : ""}>
                    <td>{stop.station_city}</td>
                    <td>{stop.station_abbreviation}</td>
                    <td>{(() => {
                      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const startDay = days[stop.start_day];
                      const endDay = stop.end_day !== stop.start_day ? `-${days[stop.end_day]}` : '';
                      return `Day ${startDay}${endDay}`;
                    })()}</td>
                    <td>{isSource(stop) ? "Source" : stop.arrival_time}</td>
                    <td>{isDestination(stop) ? "Destination" : stop.departure_time}</td>
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

export default TrainSchedulePage