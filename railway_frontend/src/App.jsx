"use client"

import { useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import "./App.css"
import LoginPage from "./components/LoginPage"
import Dashboard from "./components/Dashboard"
import BookingPage from "./components/BookingPage"
import StatusPage from "./components/StatusPage"
import CancellationPage from "./components/CancellationPage"
import PassengerListPage from "./components/PassengerListPage"
import WaitlistPage from "./components/WaitlistPage"
import RevenuePage from "./components/RevenuePage"
import CancellationRecordsPage from "./components/CancellationRecordsPage"
import BusiestRoutePage from "./components/BusiestRoutePage"
import ItemizedBillPage from "./components/ItemizedBillPage"
import AvailableSeatsPage from "./components/AvailableSeatsPage"
import TrainSchedulePage from "./components/TrainSchedulePage"
import PaymentPage from "./components/PaymentPage"
import CancelTrainPage from "./components/CancelTrainPage"
import { ThemeProvider } from "./components/ThemeProvider"
import Layout from "./components/Layout"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="app-container">
          <Layout user={user} onLogout={handleLogout} isLoggedIn={isLoggedIn}>
            <Routes>
              <Route
                path="/"
                element={isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />}
              />
              <Route
                path="/dashboard"
                element={isLoggedIn ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
              />
              <Route path="/booking" element={isLoggedIn ? <BookingPage user={user} /> : <Navigate to="/" />} />
              <Route path="/payment" element={isLoggedIn ? <PaymentPage /> : <Navigate to="/" />} />
              <Route path="/status" element={isLoggedIn ? <StatusPage user={user} /> : <Navigate to="/" />} />
              <Route
                path="/cancellation"
                element={isLoggedIn ? <CancellationPage user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/passenger-list"
                element={isLoggedIn ? <PassengerListPage user={user} /> : <Navigate to="/" />}
              />
              <Route path="/waitlist" element={isLoggedIn ? <WaitlistPage user={user} /> : <Navigate to="/" />} />
              <Route path="/revenue" element={isLoggedIn ? <RevenuePage /> : <Navigate to="/" />} />
              <Route
                path="/cancellation-records"
                element={isLoggedIn ? <CancellationRecordsPage user={user} /> : <Navigate to="/" />}
              />
              <Route path="/busiest-route" element={isLoggedIn ? <BusiestRoutePage /> : <Navigate to="/" />} />
              <Route path="/itemized-bill" element={isLoggedIn ? <ItemizedBillPage /> : <Navigate to="/" />} />
              <Route path="/available-seats" element={isLoggedIn ? <AvailableSeatsPage /> : <Navigate to="/" />} />
              <Route
                path="/train-schedule"
                element={isLoggedIn ? <TrainSchedulePage user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/cancel-train"
                element={isLoggedIn ? <CancelTrainPage user={user} /> : <Navigate to="/" />}
              />
            </Routes>
          </Layout>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
